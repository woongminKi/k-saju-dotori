import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

// Controllable in-memory Stripe SDK mock — same shape as lib/__tests__/payment-stripe.test.ts, extended
// with webhooks.constructEvent (verification), checkout.sessions.list (payment_intent -> session lookup)
// and checkout.sessions.expire. Both the route's `new Stripe()` and the provider's share this state.
const stripeState = {
  sessions: new Map<string, Record<string, unknown>>(),
  refunds: [] as Record<string, unknown>[],
  expiredSessions: [] as string[],
  nextSessionId: 0,
};

vi.mock('stripe', () => {
  class MockStripe {
    checkout = {
      sessions: {
        create: vi.fn(async (params: any) => {
          const id = `cs_test_${stripeState.nextSessionId++}`;
          const session: Record<string, unknown> = {
            id,
            url: `https://checkout.stripe.test/${id}`,
            status: 'open',
            payment_status: 'unpaid',
            amount_total: params.line_items[0].price_data.unit_amount,
            client_reference_id: params.client_reference_id,
            metadata: params.metadata,
            payment_intent: `pi_${id}`,
          };
          stripeState.sessions.set(id, session);
          return session;
        }),
        retrieve: vi.fn(async (id: string) => {
          const s = stripeState.sessions.get(id);
          if (!s) throw new Error(`no such session: ${id}`);
          return s;
        }),
        expire: vi.fn(async (id: string) => {
          const s = stripeState.sessions.get(id);
          if (!s) throw new Error(`no such session: ${id}`);
          s.status = 'expired';
          stripeState.expiredSessions.push(id);
          return s;
        }),
        list: vi.fn(async ({ payment_intent }: { payment_intent: string; limit?: number }) => {
          const data = [...stripeState.sessions.values()].filter((s) => s.payment_intent === payment_intent);
          return { data: data.slice(0, 1) };
        }),
      },
    };
    refunds = {
      create: vi.fn(async (params: any) => {
        stripeState.refunds.push(params);
        return { id: 'rf_test', ...params };
      }),
    };
    webhooks = {
      // A light wrapper — no real HMAC. Returns the request body parsed as the event, or throws when a
      // test drives the invalid-signature path with the sentinel signature.
      constructEvent: vi.fn((rawBody: string, signature: string) => {
        if (signature === 'bad_sig') throw new Error('signature verification failed');
        return JSON.parse(rawBody);
      }),
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_secretKey: string) {}
  }
  return { default: MockStripe };
});

import { POST } from '../route';
import { getPayment, getStore } from '../../../../../../lib/services';
import { balance as walletBalance } from '../../../../../../lib/wallet';

/** Mark a mock Checkout Session as fully paid (what Stripe reports after the user completes payment). */
function markSessionPaid(sessionId: string): void {
  const s = stripeState.sessions.get(sessionId);
  if (!s) throw new Error(`test setup: no session ${sessionId}`);
  s.status = 'complete';
  s.payment_status = 'paid';
}

function webhookRequest(event: unknown, signature = 'good_sig'): Request {
  return new Request('http://localhost/api/payments/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': signature, 'content-type': 'application/json' },
    body: JSON.stringify(event),
  });
}

const completedEvent = (orderId: string, sessionId: string) => ({
  type: 'checkout.session.completed',
  data: { object: { id: sessionId, client_reference_id: orderId, metadata: { orderId } } },
});
const expiredEvent = (orderId: string, sessionId: string) => ({
  type: 'checkout.session.expired',
  data: { object: { id: sessionId, client_reference_id: orderId, metadata: { orderId } } },
});
const chargeRefundedEvent = (paymentIntentId: string) => ({
  type: 'charge.refunded',
  data: { object: { id: 'ch_test', payment_intent: paymentIntentId } },
});

beforeAll(() => {
  // Both server secrets present -> services wires a real StripePaymentProvider (over the mocked SDK).
  // No Supabase envs -> InMemoryStore. Set before the first getPayment()/getStore() (lazy, cached).
  process.env.STRIPE_SECRET_KEY = 'sk_test_x';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_x';
  process.env.PII_ENC_KEY = '0'.repeat(64);
  process.env.PII_HASH_KEY = 'test-hash-key';
});

beforeEach(() => {
  stripeState.sessions.clear();
  stripeState.refunds = [];
  stripeState.expiredSessions = [];
  stripeState.nextSessionId = 0;
});

describe('POST /api/payments/stripe/webhook', () => {
  it('valid signature + checkout.session.completed confirms the order', async () => {
    const charge = await getPayment().createCharge({ userId: 'wh-complete', units: 1 });
    markSessionPaid(charge.pgToken);

    const res = await POST(webhookRequest(completedEvent(charge.orderId, charge.pgToken)));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect((await getStore().getOrder(charge.orderId))?.status).toBe('paid');
    expect(await walletBalance(getStore(), 'wh-complete')).toBe(1);
  });

  it('invalid signature returns 400 and does NOT confirm anything', async () => {
    const charge = await getPayment().createCharge({ userId: 'wh-badsig', units: 1 });
    markSessionPaid(charge.pgToken);

    const res = await POST(webhookRequest(completedEvent(charge.orderId, charge.pgToken), 'bad_sig'));

    expect(res.status).toBe(400);
    expect((await getStore().getOrder(charge.orderId))?.status).toBe('pending');
    expect(await walletBalance(getStore(), 'wh-badsig')).toBe(0);
  });

  it('two deliveries of the same completed event settle exactly once (idempotent double-delivery)', async () => {
    const charge = await getPayment().createCharge({ userId: 'wh-double', units: 3 });
    markSessionPaid(charge.pgToken);
    const event = completedEvent(charge.orderId, charge.pgToken);

    const first = await POST(webhookRequest(event));
    const second = await POST(webhookRequest(event));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await walletBalance(getStore(), 'wh-double')).toBe(3); // credited once, not six
  });

  it('checkout.session.expired cancels the order and expires the session', async () => {
    const charge = await getPayment().createCharge({ userId: 'wh-expire', units: 1 });

    const res = await POST(webhookRequest(expiredEvent(charge.orderId, charge.pgToken)));

    expect(res.status).toBe(200);
    expect((await getStore().getOrder(charge.orderId))?.status).toBe('canceled');
    expect(stripeState.expiredSessions).toContain(charge.pgToken);
  });

  it('charge.refunded reclaims a paid order without calling refunds.create again', async () => {
    const charge = await getPayment().createCharge({ userId: 'wh-refund', units: 3 });
    markSessionPaid(charge.pgToken);
    await getPayment().confirm(charge.orderId, charge.pgToken);
    expect(await walletBalance(getStore(), 'wh-refund')).toBe(3);

    const res = await POST(webhookRequest(chargeRefundedEvent(`pi_${charge.pgToken}`)));

    expect(res.status).toBe(200);
    expect(stripeState.refunds).toHaveLength(0); // dashboard already refunded — we never re-refund
    expect(await walletBalance(getStore(), 'wh-refund')).toBe(0);
    expect((await getStore().getOrder(charge.orderId))?.status).toBe('refunded');
  });
});
