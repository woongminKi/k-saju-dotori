import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

// Controllable in-memory Stripe SDK mock. Tests drive it via `stripeState`.
const stripeState = {
  sessions: new Map<string, Record<string, unknown>>(),
  createdSessions: [] as Record<string, unknown>[],
  refunds: [] as Record<string, unknown>[],
  nextSessionId: 0,
  createShouldThrow: false,
};

vi.mock('stripe', () => {
  class MockStripe {
    checkout = {
      sessions: {
        create: vi.fn(async (params: any) => {
          if (stripeState.createShouldThrow) throw new Error('stripe unavailable');
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
          stripeState.createdSessions.push(session);
          return session;
        }),
        retrieve: vi.fn(async (id: string) => {
          const s = stripeState.sessions.get(id);
          if (!s) throw new Error(`no such session: ${id}`);
          return s;
        }),
      },
    };
    refunds = {
      create: vi.fn(async (params: any) => {
        stripeState.refunds.push(params);
        return { id: 'rf_test', ...params };
      }),
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_secretKey: string) {}
  }
  return { default: MockStripe };
});

import { InMemoryStore } from '../store';
import { StripePaymentProvider } from '../payment-stripe';
import { DEFAULT_CURRENCY } from '../payment';
import { balance as walletBalance, spend } from '../wallet';
import { oracleBalance } from '../oracle-wallet';
import { pointsBalance, grantPoints } from '../points';
import { findPackage, findPackageFor } from '../pricing';

const OPTS = { secretKey: 'sk_test_x', siteUrl: 'https://dotori.test' };

/** Mark a mock Checkout Session as fully paid (what Stripe reports after the user completes payment). */
function markSessionPaid(sessionId: string): void {
  const s = stripeState.sessions.get(sessionId);
  if (!s) throw new Error(`test setup: no session ${sessionId}`);
  s.status = 'complete';
  s.payment_status = 'paid';
}

beforeAll(() => {
  process.env.PII_ENC_KEY = '0'.repeat(64);
  process.env.PII_HASH_KEY = 'test-hash-key';
});

beforeEach(() => {
  stripeState.sessions.clear();
  stripeState.createdSessions = [];
  stripeState.refunds = [];
  stripeState.nextSessionId = 0;
  stripeState.createShouldThrow = false;
});

describe('StripePaymentProvider — createCharge', () => {
  it('creates a pending order + Checkout Session, storing the session id as pgToken', async () => {
    const store = new InMemoryStore();
    const payment = new StripePaymentProvider(store, OPTS);
    const pkg = findPackage(3);

    const charge = await payment.createCharge({ userId: 'u1', units: 3 });

    expect(charge.amountCents).toBe(pkg.amountCents);
    expect(charge.currency).toBe(DEFAULT_CURRENCY);
    expect(charge.redirectUrl).toBe(`https://checkout.stripe.test/${charge.pgToken}`);
    expect(stripeState.createdSessions).toHaveLength(1);
    // Charge with no points applied == full package price.
    expect(stripeState.createdSessions[0]!.amount_total).toBe(pkg.amountCents);
    expect(stripeState.createdSessions[0]!.client_reference_id).toBe(charge.orderId);

    const order = await store.getOrder(charge.orderId);
    expect(order?.status).toBe('pending');
    expect(order?.pgToken).toBe(charge.pgToken);
  });

  it('subtracts applied points from the Stripe unit_amount (charge = amountCents - pointsApplied)', async () => {
    const store = new InMemoryStore();
    const payment = new StripePaymentProvider(store, OPTS);
    await grantPoints(store, 'u1', 500, 'referral_referrer', 'ref-1');
    const pkg = findPackage(3);

    const charge = await payment.createCharge({ userId: 'u1', units: 3, pointsApplied: 200 });

    expect(charge.amountCents).toBe(pkg.amountCents); // returned amount is the full price
    expect(stripeState.createdSessions[0]!.amount_total).toBe(pkg.amountCents - 200); // Stripe charges the net
  });

  it('throws when applied points exceed the package price', async () => {
    const store = new InMemoryStore();
    const payment = new StripePaymentProvider(store, OPTS);
    const pkg = findPackage(1);

    await expect(
      payment.createCharge({ userId: 'u1', units: 1, pointsApplied: pkg.amountCents + 1 }),
    ).rejects.toThrow(/exceed/i);
    expect(stripeState.createdSessions).toHaveLength(0);
  });

  it('full points coverage (charge == 0) never calls Stripe and points at the approve route', async () => {
    const store = new InMemoryStore();
    const payment = new StripePaymentProvider(store, OPTS);
    const pkg = findPackage(1);
    await grantPoints(store, 'u1', pkg.amountCents, 'referral_referrer', 'ref-1');

    const charge = await payment.createCharge({ userId: 'u1', units: 1, pointsApplied: pkg.amountCents });

    expect(stripeState.createdSessions).toHaveLength(0);
    expect(charge.pgToken).toBe('');
    expect(charge.redirectUrl).toBe(`${OPTS.siteUrl}/api/checkout/approve?orderId=${charge.orderId}`);
  });

  it('marks the order failed when the Stripe session create throws (so a retry is not blocked)', async () => {
    const store = new InMemoryStore();
    const payment = new StripePaymentProvider(store, OPTS);
    stripeState.createShouldThrow = true;

    await expect(payment.createCharge({ userId: 'u1', units: 1 })).rejects.toThrow(/unavailable/i);
    const orders = await store.pendingOrdersForUserSince('u1', 0);
    expect(orders).toHaveLength(0); // no lingering pending order to trip the dedup index
  });
});

describe('StripePaymentProvider — confirm', () => {
  it('confirms a paid session and credits the reading wallet', async () => {
    const store = new InMemoryStore();
    const payment = new StripePaymentProvider(store, OPTS);
    const charge = await payment.createCharge({ userId: 'u1', units: 3 });
    markSessionPaid(charge.pgToken);

    const confirmed = await payment.confirm(charge.orderId, charge.pgToken);

    expect(confirmed.units).toBe(3);
    expect(await walletBalance(store, 'u1')).toBe(3);
    expect((await store.getOrder(charge.orderId))?.status).toBe('paid');
  });

  it('is idempotent — a second confirm does not double-credit', async () => {
    const store = new InMemoryStore();
    const payment = new StripePaymentProvider(store, OPTS);
    const charge = await payment.createCharge({ userId: 'u1', units: 1 });
    markSessionPaid(charge.pgToken);

    await payment.confirm(charge.orderId, charge.pgToken);
    await payment.confirm(charge.orderId, charge.pgToken); // e.g. webhook after the approve redirect

    expect(await walletBalance(store, 'u1')).toBe(1);
  });

  it('throws when the Stripe session is not paid (payment_status !== paid)', async () => {
    const store = new InMemoryStore();
    const payment = new StripePaymentProvider(store, OPTS);
    const charge = await payment.createCharge({ userId: 'u1', units: 1 });
    // session left as status=open / payment_status=unpaid

    await expect(payment.confirm(charge.orderId, charge.pgToken)).rejects.toThrow(/not completed/i);
    expect((await store.getOrder(charge.orderId))?.status).toBe('pending');
  });

  it('throws when the collected amount does not match the expected charge (defense-in-depth)', async () => {
    const store = new InMemoryStore();
    const payment = new StripePaymentProvider(store, OPTS);
    const charge = await payment.createCharge({ userId: 'u1', units: 1 });
    markSessionPaid(charge.pgToken);
    // Tamper with what Stripe reports as collected.
    stripeState.sessions.get(charge.pgToken)!.amount_total = 1;

    await expect(payment.confirm(charge.orderId, charge.pgToken)).rejects.toThrow(/does not match/i);
    expect((await store.getOrder(charge.orderId))?.status).toBe('pending');
  });

  it('spends applied points when a paid order is confirmed', async () => {
    const store = new InMemoryStore();
    const payment = new StripePaymentProvider(store, OPTS);
    await grantPoints(store, 'u1', 500, 'referral_referrer', 'ref-1');
    const charge = await payment.createCharge({ userId: 'u1', units: 1, pointsApplied: 300 });
    markSessionPaid(charge.pgToken);

    await payment.confirm(charge.orderId, charge.pgToken);

    expect(await pointsBalance(store, 'u1')).toBe(200);
    expect(await walletBalance(store, 'u1')).toBe(1);
  });

  it('settles a zero-charge (full points) order without calling Stripe retrieve', async () => {
    const store = new InMemoryStore();
    const payment = new StripePaymentProvider(store, OPTS);
    const pkg = findPackageFor('oracle', 12);
    await grantPoints(store, 'u1', pkg.amountCents, 'referral_referrer', 'ref-1');
    const charge = await payment.createCharge({ userId: 'u1', units: 12, product: 'oracle', pointsApplied: pkg.amountCents });

    const confirmed = await payment.confirm(charge.orderId); // approve route passes no session_id

    expect(confirmed.units).toBe(12);
    expect(await oracleBalance(store, 'u1')).toBe(12);
    expect(await pointsBalance(store, 'u1')).toBe(0);
  });
});

describe('StripePaymentProvider — refund', () => {
  it('refunds a fully-unused paid order: reverses the payment intent, reclaims units, restores points', async () => {
    const store = new InMemoryStore();
    const payment = new StripePaymentProvider(store, OPTS);
    await grantPoints(store, 'u1', 300, 'referral_referrer', 'ref-1');
    const charge = await payment.createCharge({ userId: 'u1', units: 3, pointsApplied: 300 });
    markSessionPaid(charge.pgToken);
    await payment.confirm(charge.orderId, charge.pgToken);

    await payment.refund(charge.orderId);

    expect(stripeState.refunds).toHaveLength(1);
    expect(stripeState.refunds[0]!.payment_intent).toBe(`pi_${charge.pgToken}`);
    expect(await walletBalance(store, 'u1')).toBe(0);
    expect(await pointsBalance(store, 'u1')).toBe(300);
    expect((await store.getOrder(charge.orderId))?.status).toBe('refunded');
  });

  it('throws before touching Stripe once any granted unit has been used', async () => {
    const store = new InMemoryStore();
    const payment = new StripePaymentProvider(store, OPTS);
    const charge = await payment.createCharge({ userId: 'u1', units: 3 });
    markSessionPaid(charge.pgToken);
    await payment.confirm(charge.orderId, charge.pgToken);
    await spend(store, 'u1', 'solo');

    await expect(payment.refund(charge.orderId)).rejects.toThrow(/already been used/i);
    expect(stripeState.refunds).toHaveLength(0); // Stripe never called
    expect((await store.getOrder(charge.orderId))?.status).toBe('paid');
  });

  it('is a no-op on a never-paid order', async () => {
    const store = new InMemoryStore();
    const payment = new StripePaymentProvider(store, OPTS);
    const charge = await payment.createCharge({ userId: 'u1', units: 1 });

    await payment.refund(charge.orderId);
    expect(stripeState.refunds).toHaveLength(0);
    expect((await store.getOrder(charge.orderId))?.status).toBe('pending');
  });
});

describe('StripePaymentProvider — reconcilePending', () => {
  it('settles complete+paid sessions and cancels expired ones', async () => {
    const store = new InMemoryStore();
    const payment = new StripePaymentProvider(store, OPTS);

    const paidCharge = await payment.createCharge({ userId: 'u1', units: 1 });
    markSessionPaid(paidCharge.pgToken);

    const expiredCharge = await payment.createCharge({ userId: 'u2', units: 1 });
    stripeState.sessions.get(expiredCharge.pgToken)!.status = 'expired';

    const openCharge = await payment.createCharge({ userId: 'u3', units: 1 }); // still 'open'

    const result = await payment.reconcilePending(Date.now() + 1000, 0);

    expect(result.checked).toBe(3);
    expect(result.paid).toBe(1);
    expect(result.canceled).toBe(1);
    expect((await store.getOrder(paidCharge.orderId))?.status).toBe('paid');
    expect((await store.getOrder(expiredCharge.orderId))?.status).toBe('canceled');
    expect((await store.getOrder(openCharge.orderId))?.status).toBe('pending');
    expect(await walletBalance(store, 'u1')).toBe(1);
  });
});
