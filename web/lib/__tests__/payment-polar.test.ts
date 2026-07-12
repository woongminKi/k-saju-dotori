import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { createHmac } from 'node:crypto';

// ── Controllable in-memory Polar REST mock (global fetch). Tests drive it via `polarState`. ──────────────
// Test product-id map + the fixed price each product collects (Polar products are fixed-price; the mock
// returns the product's price as the checkout `amount`, matching real Polar behavior).
const PRODUCT_IDS: Record<string, string> = {
  'reading:1': 'prod_r1', 'reading:3': 'prod_r3', 'reading:5': 'prod_r5',
  'oracle:12': 'prod_o12', 'oracle:30': 'prod_o30', 'oracle:80': 'prod_o80',
};
const PRICE_BY_PRODUCT: Record<string, number> = {
  prod_r1: 499, prod_r3: 1199, prod_r5: 1799,
  prod_o12: 199, prod_o30: 299, prod_o80: 599,
};

const polarState = {
  checkouts: new Map<string, Record<string, unknown>>(),
  createdCheckouts: [] as Record<string, unknown>[],
  refunds: [] as Record<string, unknown>[],
  nextId: 0,
  createShouldThrow: false,
};

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const fetchMock = vi.fn(async (url: unknown, init: RequestInit = {}) => {
  const u = String(url);
  const method = (init.method ?? 'GET').toUpperCase();

  if (u.endsWith('/v1/checkouts/') && method === 'POST') {
    if (polarState.createShouldThrow) return jsonResponse({ error: 'unavailable' }, 500);
    const body = JSON.parse(init.body as string);
    const productId = body.products[0] as string;
    const id = `polar_co_${polarState.nextId++}`;
    const checkout: Record<string, unknown> = {
      id,
      url: `https://polar.test/checkout/${id}`,
      status: 'open',
      amount: PRICE_BY_PRODUCT[productId],
      currency: 'usd',
      // NOTE deliberately NO order_id: verified against the live sandbox (2026-07-12) — Polar's checkout
      // GET omits the order even when succeeded. refund() must use the /v1/orders/?checkout_id= lookup
      // below; a fabricated order_id in this mock previously hid a real refund-path bug.
      metadata: body.metadata,
    };
    polarState.checkouts.set(id, checkout);
    polarState.createdCheckouts.push(checkout);
    return jsonResponse(checkout, 201);
  }

  const getMatch = u.match(/\/v1\/checkouts\/([^/?]+)$/);
  if (getMatch && method === 'GET') {
    const c = polarState.checkouts.get(getMatch[1]!);
    if (!c) return jsonResponse({ error: 'not found' }, 404);
    return jsonResponse(c, 200);
  }

  const ordersMatch = u.match(/\/v1\/orders\/\?checkout_id=([^&]+)/);
  if (ordersMatch && method === 'GET') {
    const checkoutId = decodeURIComponent(ordersMatch[1]!);
    const c = polarState.checkouts.get(checkoutId);
    // Mirror the real API: an order exists only once the checkout has succeeded.
    if (!c || c['status'] !== 'succeeded') return jsonResponse({ items: [] }, 200);
    return jsonResponse({ items: [{ id: `polar_order_${checkoutId}` }] }, 200);
  }

  if (u.endsWith('/v1/refunds') && method === 'POST') {
    const body = JSON.parse(init.body as string);
    polarState.refunds.push(body);
    return jsonResponse({ id: 'polar_refund_1', ...body }, 201);
  }

  return jsonResponse({ error: `unexpected ${method} ${u}` }, 500);
});

vi.stubGlobal('fetch', fetchMock);

import { InMemoryStore } from '../store';
import { PolarPaymentProvider } from '../payment-polar';
import { DEFAULT_CURRENCY } from '../payment';
import { verifyPolarSignature } from '../polar-webhook';
import { balance as walletBalance, spend } from '../wallet';
import { oracleBalance } from '../oracle-wallet';
import { pointsBalance, grantPoints } from '../points';
import { findPackage, findPackageFor } from '../pricing';

const OPTS = {
  accessToken: 'polar_test',
  server: 'sandbox' as const,
  siteUrl: 'https://dotori.test',
  productIds: PRODUCT_IDS,
};

/** Mark a mock checkout as fully paid (what Polar reports after the user completes payment). */
function markCheckoutSucceeded(checkoutId: string): void {
  const c = polarState.checkouts.get(checkoutId);
  if (!c) throw new Error(`test setup: no checkout ${checkoutId}`);
  c.status = 'succeeded';
}

beforeAll(() => {
  process.env.PII_ENC_KEY = '0'.repeat(64);
  process.env.PII_HASH_KEY = 'test-hash-key';
});

beforeEach(() => {
  polarState.checkouts.clear();
  polarState.createdCheckouts = [];
  polarState.refunds = [];
  polarState.nextId = 0;
  polarState.createShouldThrow = false;
  fetchMock.mockClear();
});

describe('PolarPaymentProvider — createCharge', () => {
  it('creates a pending order + Polar checkout, storing the checkout id as pgToken', async () => {
    const store = new InMemoryStore();
    const payment = new PolarPaymentProvider(store, OPTS);
    const pkg = findPackage(3);

    const charge = await payment.createCharge({ userId: 'u1', units: 3 });

    expect(charge.amountCents).toBe(pkg.amountCents);
    expect(charge.currency).toBe(DEFAULT_CURRENCY);
    expect(charge.redirectUrl).toBe(`https://polar.test/checkout/${charge.pgToken}`);
    expect(polarState.createdCheckouts).toHaveLength(1);
    expect(polarState.createdCheckouts[0]!.amount).toBe(pkg.amountCents);
    expect((polarState.createdCheckouts[0]!.metadata as Record<string, unknown>).orderId).toBe(charge.orderId);

    const order = await store.getOrder(charge.orderId);
    expect(order?.status).toBe('pending');
    expect(order?.pgToken).toBe(charge.pgToken);
  });

  it('full points coverage (charge == 0) never calls Polar and points at the approve route', async () => {
    const store = new InMemoryStore();
    const payment = new PolarPaymentProvider(store, OPTS);
    const pkg = findPackage(1);
    await grantPoints(store, 'u1', pkg.amountCents, 'referral_referrer', 'ref-1');

    const charge = await payment.createCharge({ userId: 'u1', units: 1, pointsApplied: pkg.amountCents });

    expect(polarState.createdCheckouts).toHaveLength(0);
    expect(charge.pgToken).toBe('');
    expect(charge.redirectUrl).toBe(`${OPTS.siteUrl}/api/checkout/approve?orderId=${charge.orderId}`);
  });

  it('rejects a PARTIAL points redemption (fixed-price products cannot be discounted per-checkout)', async () => {
    const store = new InMemoryStore();
    const payment = new PolarPaymentProvider(store, OPTS);
    await grantPoints(store, 'u1', 500, 'referral_referrer', 'ref-1');

    await expect(
      payment.createCharge({ userId: 'u1', units: 3, pointsApplied: 200 }),
    ).rejects.toThrow(/partial points/i);
    expect(polarState.createdCheckouts).toHaveLength(0);
  });

  it('throws when applied points exceed the package price', async () => {
    const store = new InMemoryStore();
    const payment = new PolarPaymentProvider(store, OPTS);
    const pkg = findPackage(1);

    await expect(
      payment.createCharge({ userId: 'u1', units: 1, pointsApplied: pkg.amountCents + 1 }),
    ).rejects.toThrow(/exceed/i);
    expect(polarState.createdCheckouts).toHaveLength(0);
  });

  it('marks the order failed when the Polar checkout create throws (so a retry is not blocked)', async () => {
    const store = new InMemoryStore();
    const payment = new PolarPaymentProvider(store, OPTS);
    polarState.createShouldThrow = true;

    await expect(payment.createCharge({ userId: 'u1', units: 1 })).rejects.toThrow(/failed/i);
    const orders = await store.pendingOrdersForUserSince('u1', 0);
    expect(orders).toHaveLength(0); // no lingering pending order to trip the dedup index
  });
});

describe('PolarPaymentProvider — confirm', () => {
  it('confirms a succeeded checkout and credits the reading wallet', async () => {
    const store = new InMemoryStore();
    const payment = new PolarPaymentProvider(store, OPTS);
    const charge = await payment.createCharge({ userId: 'u1', units: 3 });
    markCheckoutSucceeded(charge.pgToken);

    const confirmed = await payment.confirm(charge.orderId, charge.pgToken);

    expect(confirmed.units).toBe(3);
    expect(await walletBalance(store, 'u1')).toBe(3);
    expect((await store.getOrder(charge.orderId))?.status).toBe('paid');
  });

  it('is idempotent — a second confirm does not double-credit', async () => {
    const store = new InMemoryStore();
    const payment = new PolarPaymentProvider(store, OPTS);
    const charge = await payment.createCharge({ userId: 'u1', units: 1 });
    markCheckoutSucceeded(charge.pgToken);

    await payment.confirm(charge.orderId, charge.pgToken);
    await payment.confirm(charge.orderId, charge.pgToken); // e.g. order.paid webhook after the approve redirect

    expect(await walletBalance(store, 'u1')).toBe(1);
  });

  it('throws when the checkout is not succeeded (status still open)', async () => {
    const store = new InMemoryStore();
    const payment = new PolarPaymentProvider(store, OPTS);
    const charge = await payment.createCharge({ userId: 'u1', units: 1 });
    // checkout left as status=open

    await expect(payment.confirm(charge.orderId, charge.pgToken)).rejects.toThrow(/not completed/i);
    expect((await store.getOrder(charge.orderId))?.status).toBe('pending');
  });

  it('treats the intermediate "confirmed" status as NOT paid', async () => {
    const store = new InMemoryStore();
    const payment = new PolarPaymentProvider(store, OPTS);
    const charge = await payment.createCharge({ userId: 'u1', units: 1 });
    polarState.checkouts.get(charge.pgToken)!.status = 'confirmed';

    await expect(payment.confirm(charge.orderId, charge.pgToken)).rejects.toThrow(/not completed/i);
    expect((await store.getOrder(charge.orderId))?.status).toBe('pending');
  });

  it('throws when the collected amount does not match the expected charge (defense-in-depth)', async () => {
    const store = new InMemoryStore();
    const payment = new PolarPaymentProvider(store, OPTS);
    const charge = await payment.createCharge({ userId: 'u1', units: 1 });
    markCheckoutSucceeded(charge.pgToken);
    polarState.checkouts.get(charge.pgToken)!.amount = 1; // tamper with what Polar reports as collected

    await expect(payment.confirm(charge.orderId, charge.pgToken)).rejects.toThrow(/does not match/i);
    expect((await store.getOrder(charge.orderId))?.status).toBe('pending');
  });

  it('settles a zero-charge (full points) order without calling Polar', async () => {
    const store = new InMemoryStore();
    const payment = new PolarPaymentProvider(store, OPTS);
    const pkg = findPackageFor('oracle', 12);
    await grantPoints(store, 'u1', pkg.amountCents, 'referral_referrer', 'ref-1');
    const charge = await payment.createCharge({ userId: 'u1', units: 12, product: 'oracle', pointsApplied: pkg.amountCents });

    const confirmed = await payment.confirm(charge.orderId); // approve route passes no checkout id

    expect(confirmed.units).toBe(12);
    expect(await oracleBalance(store, 'u1')).toBe(12);
    expect(await pointsBalance(store, 'u1')).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled(); // no Polar network call anywhere in the zero-charge flow
  });
});

describe('PolarPaymentProvider — refund', () => {
  it('refunds a fully-unused paid order: calls the Polar refund API, reclaims units', async () => {
    const store = new InMemoryStore();
    const payment = new PolarPaymentProvider(store, OPTS);
    const pkg = findPackage(3);
    const charge = await payment.createCharge({ userId: 'u1', units: 3 });
    markCheckoutSucceeded(charge.pgToken);
    await payment.confirm(charge.orderId, charge.pgToken);

    await payment.refund(charge.orderId);

    expect(polarState.refunds).toHaveLength(1);
    expect(polarState.refunds[0]!.order_id).toBe(`polar_order_${charge.pgToken}`);
    expect(polarState.refunds[0]!.amount).toBe(pkg.amountCents);
    expect(await walletBalance(store, 'u1')).toBe(0);
    expect((await store.getOrder(charge.orderId))?.status).toBe('refunded');
  });

  it('throws before touching Polar once any granted unit has been used', async () => {
    const store = new InMemoryStore();
    const payment = new PolarPaymentProvider(store, OPTS);
    const charge = await payment.createCharge({ userId: 'u1', units: 3 });
    markCheckoutSucceeded(charge.pgToken);
    await payment.confirm(charge.orderId, charge.pgToken);
    await spend(store, 'u1', 'solo');

    await expect(payment.refund(charge.orderId)).rejects.toThrow(/already been used/i);
    expect(polarState.refunds).toHaveLength(0); // Polar never called
    expect((await store.getOrder(charge.orderId))?.status).toBe('paid');
  });

  it('is a no-op on a never-paid order', async () => {
    const store = new InMemoryStore();
    const payment = new PolarPaymentProvider(store, OPTS);
    const charge = await payment.createCharge({ userId: 'u1', units: 1 });

    await payment.refund(charge.orderId);
    expect(polarState.refunds).toHaveLength(0);
    expect((await store.getOrder(charge.orderId))?.status).toBe('pending');
  });
});

describe('PolarPaymentProvider — cancel', () => {
  it('cancels the order (no Polar-side call — checkouts lapse via expires_at)', async () => {
    const store = new InMemoryStore();
    const payment = new PolarPaymentProvider(store, OPTS);
    const charge = await payment.createCharge({ userId: 'u1', units: 1 });
    fetchMock.mockClear();

    await payment.cancel(charge.orderId);

    expect(fetchMock).not.toHaveBeenCalled();
    expect((await store.getOrder(charge.orderId))?.status).toBe('canceled');
  });

  it('throws for a missing order', async () => {
    const store = new InMemoryStore();
    const payment = new PolarPaymentProvider(store, OPTS);
    await expect(payment.cancel('nope')).rejects.toThrow(/not found/i);
  });
});

describe('PolarPaymentProvider — reclaimDashboardRefund', () => {
  it('reclaims a fully-unused paid order without calling the refund API (money already reversed at Polar)', async () => {
    const store = new InMemoryStore();
    const payment = new PolarPaymentProvider(store, OPTS);
    const charge = await payment.createCharge({ userId: 'u1', units: 3 });
    markCheckoutSucceeded(charge.pgToken);
    await payment.confirm(charge.orderId, charge.pgToken);

    await payment.reclaimDashboardRefund(charge.orderId);

    expect(polarState.refunds).toHaveLength(0); // never call Polar — the dashboard already refunded
    expect(await walletBalance(store, 'u1')).toBe(0);
    expect((await store.getOrder(charge.orderId))?.status).toBe('refunded');
  });

  it('is a no-op on an order that is not paid (e.g. already refunded via our own path)', async () => {
    const store = new InMemoryStore();
    const payment = new PolarPaymentProvider(store, OPTS);
    const charge = await payment.createCharge({ userId: 'u1', units: 1 });

    await expect(payment.reclaimDashboardRefund(charge.orderId)).resolves.toBeUndefined();
    expect((await store.getOrder(charge.orderId))?.status).toBe('pending');
  });

  it('does not throw when granted units were already used — logs and leaves the order paid', async () => {
    const store = new InMemoryStore();
    const payment = new PolarPaymentProvider(store, OPTS);
    const charge = await payment.createCharge({ userId: 'u1', units: 3 });
    markCheckoutSucceeded(charge.pgToken);
    await payment.confirm(charge.orderId, charge.pgToken);
    await spend(store, 'u1', 'solo');

    await expect(payment.reclaimDashboardRefund(charge.orderId)).resolves.toBeUndefined();

    expect(polarState.refunds).toHaveLength(0);
    expect((await store.getOrder(charge.orderId))?.status).toBe('paid'); // not transitioned — reclaim skipped
  });
});

describe('PolarPaymentProvider — reconcilePending', () => {
  it('settles succeeded checkouts and cancels expired ones', async () => {
    const store = new InMemoryStore();
    const payment = new PolarPaymentProvider(store, OPTS);

    const paidCharge = await payment.createCharge({ userId: 'u1', units: 1 });
    markCheckoutSucceeded(paidCharge.pgToken);

    const expiredCharge = await payment.createCharge({ userId: 'u2', units: 1 });
    polarState.checkouts.get(expiredCharge.pgToken)!.status = 'expired';

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

// ── Standard Webhooks signature verification (real HMAC, only Polar's network is faked elsewhere). ───────
const WEBHOOK_SECRET = `whsec_${Buffer.from('a-very-secret-signing-key-0123456789').toString('base64')}`;

/** Produce a valid `v1,<base64sig>` entry the way Polar would. */
function signWebhook(secret: string, id: string, timestamp: string, body: string): string {
  const key = Buffer.from(secret.slice('whsec_'.length), 'base64');
  const sig = createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64');
  return `v1,${sig}`;
}

describe('verifyPolarSignature (Standard Webhooks)', () => {
  const body = JSON.stringify({ type: 'order.paid', data: { metadata: { orderId: 'o1' } } });
  const id = 'msg_abc';

  it('accepts a correctly-signed, in-tolerance payload', () => {
    const now = Math.floor(Date.now() / 1000);
    const ts = String(now);
    const signature = signWebhook(WEBHOOK_SECRET, id, ts, body);
    expect(verifyPolarSignature(body, { id, timestamp: ts, signature }, WEBHOOK_SECRET, now)).toBe(true);
  });

  it('accepts when one of several space-delimited signatures matches (secret rotation)', () => {
    const now = Math.floor(Date.now() / 1000);
    const ts = String(now);
    const good = signWebhook(WEBHOOK_SECRET, id, ts, body);
    const signature = `v1,Zm9vYmFy ${good}`; // a bogus entry followed by the valid one
    expect(verifyPolarSignature(body, { id, timestamp: ts, signature }, WEBHOOK_SECRET, now)).toBe(true);
  });

  it('rejects a bad signature (tampered body)', () => {
    const now = Math.floor(Date.now() / 1000);
    const ts = String(now);
    const signature = signWebhook(WEBHOOK_SECRET, id, ts, body);
    const tampered = body.replace('o1', 'o2');
    expect(verifyPolarSignature(tampered, { id, timestamp: ts, signature }, WEBHOOK_SECRET, now)).toBe(false);
  });

  it('rejects a signature computed with the wrong secret', () => {
    const now = Math.floor(Date.now() / 1000);
    const ts = String(now);
    const wrongSecret = `whsec_${Buffer.from('the-wrong-key').toString('base64')}`;
    const signature = signWebhook(wrongSecret, id, ts, body);
    expect(verifyPolarSignature(body, { id, timestamp: ts, signature }, WEBHOOK_SECRET, now)).toBe(false);
  });

  it('rejects a stale timestamp even when the signature itself is valid (replay defense)', () => {
    const now = Math.floor(Date.now() / 1000);
    const staleTs = String(now - 10_000); // well outside the 300s tolerance
    const signature = signWebhook(WEBHOOK_SECRET, id, staleTs, body); // correctly signed FOR the stale ts
    // Proven valid when "now" is close to the stale ts...
    expect(verifyPolarSignature(body, { id, timestamp: staleTs, signature }, WEBHOOK_SECRET, now - 10_000 + 10)).toBe(true);
    // ...but rejected against the real, far-ahead now.
    expect(verifyPolarSignature(body, { id, timestamp: staleTs, signature }, WEBHOOK_SECRET, now)).toBe(false);
  });

  it('rejects when any required header is missing', () => {
    const now = Math.floor(Date.now() / 1000);
    const ts = String(now);
    const signature = signWebhook(WEBHOOK_SECRET, id, ts, body);
    expect(verifyPolarSignature(body, { id: null, timestamp: ts, signature }, WEBHOOK_SECRET, now)).toBe(false);
    expect(verifyPolarSignature(body, { id, timestamp: null, signature }, WEBHOOK_SECRET, now)).toBe(false);
    expect(verifyPolarSignature(body, { id, timestamp: ts, signature: null }, WEBHOOK_SECRET, now)).toBe(false);
  });
});
