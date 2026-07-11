import { describe, it, expect, beforeAll } from 'vitest';
import { InMemoryStore } from '../store';
import { StubPaymentProvider, DEFAULT_CURRENCY } from '../payment';
import { balance as walletBalance, spend } from '../wallet';
import { oracleBalance } from '../oracle-wallet';
import { pointsBalance, grantPoints } from '../points';
import { findPackage, findPackageFor } from '../pricing';

beforeAll(() => {
  process.env.PII_ENC_KEY = '0'.repeat(64);
  process.env.PII_HASH_KEY = 'test-hash-key';
});

describe('StubPaymentProvider — full checkout flow (reading units)', () => {
  it('createCharge -> confirm credits the wallet with the priced package', async () => {
    const store = new InMemoryStore();
    const payment = new StubPaymentProvider(store);

    const pkg = findPackage(3);
    const charge = await payment.createCharge({ userId: 'u1', units: 3 });

    expect(charge.amountCents).toBe(pkg.amountCents);
    expect(charge.currency).toBe(DEFAULT_CURRENCY);
    expect(charge.redirectUrl).toBe(`/api/checkout/approve?orderId=${charge.orderId}`);
    const order = await store.getOrder(charge.orderId);
    expect(order?.status).toBe('pending');

    const confirmed = await payment.confirm(charge.orderId);
    expect(confirmed.units).toBe(3);
    expect(await walletBalance(store, 'u1')).toBe(3);
    expect((await store.getOrder(charge.orderId))?.status).toBe('paid');
  });

  it('confirm is idempotent — a second confirm on the same order does not double-credit', async () => {
    const store = new InMemoryStore();
    const payment = new StubPaymentProvider(store);
    const charge = await payment.createCharge({ userId: 'u1', units: 1 });

    await payment.confirm(charge.orderId);
    await payment.confirm(charge.orderId); // idempotent

    expect(await walletBalance(store, 'u1')).toBe(1);
  });

  it('confirm on a canceled order throws', async () => {
    const store = new InMemoryStore();
    const payment = new StubPaymentProvider(store);
    const charge = await payment.createCharge({ userId: 'u1', units: 1 });
    await payment.cancel(charge.orderId);

    await expect(payment.confirm(charge.orderId)).rejects.toThrow();
    expect(await walletBalance(store, 'u1')).toBe(0);
  });

  it('cancel is a no-op on an already-confirmed order (does not un-pay it)', async () => {
    const store = new InMemoryStore();
    const payment = new StubPaymentProvider(store);
    const charge = await payment.createCharge({ userId: 'u1', units: 1 });
    await payment.confirm(charge.orderId);

    await payment.cancel(charge.orderId); // silent no-op per markOrderCanceled's atomic guard
    expect((await store.getOrder(charge.orderId))?.status).toBe('paid');
  });

  it('end-to-end: charge -> confirm -> spend a reading unit -> balance reflects the purchase', async () => {
    const store = new InMemoryStore();
    const payment = new StubPaymentProvider(store);
    const charge = await payment.createCharge({ userId: 'u1', units: 1 });
    await payment.confirm(charge.orderId);
    expect(await walletBalance(store, 'u1')).toBe(1);

    await spend(store, 'u1', 'solo'); // simulates resolveReading's charge on a generated reading
    expect(await walletBalance(store, 'u1')).toBe(0);
  });
});

describe('StubPaymentProvider — oracle credits', () => {
  it('createCharge -> confirm credits the oracle balance, not the reading wallet', async () => {
    const store = new InMemoryStore();
    const payment = new StubPaymentProvider(store);
    const pkg = findPackageFor('oracle', 12);

    const charge = await payment.createCharge({ userId: 'u1', units: 12, product: 'oracle' });
    expect(charge.amountCents).toBe(pkg.amountCents);
    await payment.confirm(charge.orderId);

    expect(await oracleBalance(store, 'u1')).toBe(12);
    expect(await walletBalance(store, 'u1')).toBe(0); // reading wallet untouched
  });
});

describe('StubPaymentProvider — points applied to a charge', () => {
  it('confirm spends the applied points once the order is paid', async () => {
    const store = new InMemoryStore();
    const payment = new StubPaymentProvider(store);
    await grantPoints(store, 'u1', 500, 'referral_referrer', 'ref-1');

    const charge = await payment.createCharge({ userId: 'u1', units: 1, pointsApplied: 300 });
    await payment.confirm(charge.orderId);

    expect(await pointsBalance(store, 'u1')).toBe(200);
    expect(await walletBalance(store, 'u1')).toBe(1);
  });

  it('confirm throws if the points balance dropped below the applied amount between validation and confirm', async () => {
    const store = new InMemoryStore();
    const payment = new StubPaymentProvider(store);
    await grantPoints(store, 'u1', 300, 'referral_referrer', 'ref-1');
    const charge = await payment.createCharge({ userId: 'u1', units: 1, pointsApplied: 300 });

    // Points balance drops out from under the order (e.g. spent on another concurrent order).
    await store.appendPoints({ userId: 'u1', delta: -300, reason: 'spend_topup', ref: 'other-order', at: Date.now() });

    await expect(payment.confirm(charge.orderId)).rejects.toThrow(/points/i);
    expect((await store.getOrder(charge.orderId))?.status).toBe('pending'); // not marked paid
  });
});

describe('StubPaymentProvider — refund', () => {
  it('refunds a paid order whose units are entirely unused: reclaims units and restores points', async () => {
    const store = new InMemoryStore();
    const payment = new StubPaymentProvider(store);
    await grantPoints(store, 'u1', 300, 'referral_referrer', 'ref-1');
    const charge = await payment.createCharge({ userId: 'u1', units: 3, pointsApplied: 300 });
    await payment.confirm(charge.orderId);
    expect(await walletBalance(store, 'u1')).toBe(3);
    expect(await pointsBalance(store, 'u1')).toBe(0);

    await payment.refund(charge.orderId);

    expect(await walletBalance(store, 'u1')).toBe(0);
    expect(await pointsBalance(store, 'u1')).toBe(300); // restored
    expect((await store.getOrder(charge.orderId))?.status).toBe('refunded');
  });

  it('refund throws once any of the granted units have been used (partial-use protection)', async () => {
    const store = new InMemoryStore();
    const payment = new StubPaymentProvider(store);
    const charge = await payment.createCharge({ userId: 'u1', units: 3 });
    await payment.confirm(charge.orderId);
    await spend(store, 'u1', 'solo'); // 2 left of the 3 granted

    await expect(payment.refund(charge.orderId)).rejects.toThrow(/already been used/i);
    expect((await store.getOrder(charge.orderId))?.status).toBe('paid'); // not refunded
    expect(await walletBalance(store, 'u1')).toBe(2); // untouched by the failed refund
  });

  it('refund is idempotent — a second refund on an already-refunded order is a silent no-op', async () => {
    const store = new InMemoryStore();
    const payment = new StubPaymentProvider(store);
    const charge = await payment.createCharge({ userId: 'u1', units: 1 });
    await payment.confirm(charge.orderId);
    await payment.refund(charge.orderId);

    await payment.refund(charge.orderId); // no throw, no double reclaim
    expect(await walletBalance(store, 'u1')).toBe(0);
  });

  it('refund on a never-paid (pending) order is a silent no-op', async () => {
    const store = new InMemoryStore();
    const payment = new StubPaymentProvider(store);
    const charge = await payment.createCharge({ userId: 'u1', units: 1 });

    await payment.refund(charge.orderId); // still pending -> no-op
    expect((await store.getOrder(charge.orderId))?.status).toBe('pending');
  });
});
