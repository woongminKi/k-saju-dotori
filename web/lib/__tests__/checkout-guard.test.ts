import { describe, it, expect, beforeEach } from 'vitest';
import {
  findDuplicatePendingOrder, redirectCache, pruneRedirectCache, CHECKOUT_RETRY_GUARD_MS,
  resolveDuplicatePendingOrder,
} from '../checkout-guard';
import type { Order } from '../store';

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: 'o1', userId: 'u1', units: 3, amountCents: 1199, currency: 'usd', status: 'pending',
    pgToken: 'tid1', product: 'reading', createdAt: 1, ...overrides,
  };
}

describe('findDuplicatePendingOrder', () => {
  it('finds an order matching product, units and applied points', () => {
    const recent = [order({ pointsApplied: 300 })];
    expect(findDuplicatePendingOrder(recent, 'reading', 3, 300)?.id).toBe('o1');
  });

  it('same product but different units is not a duplicate (different package)', () => {
    const recent = [order({ units: 3 })];
    expect(findDuplicatePendingOrder(recent, 'reading', 5, 0)).toBeUndefined();
  });

  it('same product but different pointsApplied is not a duplicate', () => {
    const recent = [order({ pointsApplied: 300 })];
    expect(findDuplicatePendingOrder(recent, 'reading', 3, 0)).toBeUndefined();
  });

  it('different product is not a duplicate', () => {
    const recent = [order({ product: 'oracle' })];
    expect(findDuplicatePendingOrder(recent, 'reading', 3, 0)).toBeUndefined();
  });

  it('an order with no product is treated as reading', () => {
    const recent = [order({ product: undefined })];
    expect(findDuplicatePendingOrder(recent, 'reading', 3, 0)?.id).toBe('o1');
  });

  it('an order with no pointsApplied is treated as 0', () => {
    const recent = [order({ pointsApplied: undefined })];
    expect(findDuplicatePendingOrder(recent, 'reading', 3, 0)?.id).toBe('o1');
  });

  it('empty list -> undefined', () => {
    expect(findDuplicatePendingOrder([], 'reading', 3, 0)).toBeUndefined();
  });

  it('multiple candidates -> deterministically picks the most recent (createdAt desc)', () => {
    const recent = [
      order({ id: 'old', createdAt: 100 }),
      order({ id: 'newest', createdAt: 300 }),
      order({ id: 'mid', createdAt: 200 }),
    ];
    expect(findDuplicatePendingOrder(recent, 'reading', 3, 0)?.id).toBe('newest');
  });
});

describe('redirectCache / pruneRedirectCache', () => {
  beforeEach(() => {
    redirectCache.clear();
  });

  it('prunes only entries past the guard window and keeps fresh ones', () => {
    const now = Date.now();
    redirectCache.set('old', { url: 'https://x/old', at: now - CHECKOUT_RETRY_GUARD_MS - 1 });
    redirectCache.set('fresh', { url: 'https://x/fresh', at: now });
    pruneRedirectCache(now);
    expect(redirectCache.has('old')).toBe(false);
    expect(redirectCache.get('fresh')?.url).toBe('https://x/fresh');
  });
});

describe('resolveDuplicatePendingOrder', () => {
  beforeEach(() => {
    redirectCache.clear();
  });

  it('cache hit — reuse the existing order redirectUrl', () => {
    redirectCache.set('dup-1', { url: 'https://x/dup-1', at: Date.now() });
    const resolution = resolveDuplicatePendingOrder(order({ id: 'dup-1', pgToken: 'tid1' }));
    expect(resolution).toEqual({ kind: 'reuse', redirectUrl: 'https://x/dup-1' });
  });

  it('cache miss (with tid) — do not cancel/reissue, advise retry', () => {
    const resolution = resolveDuplicatePendingOrder(order({ id: 'dup-2', pgToken: 'tid2' }));
    expect(resolution).toEqual({ kind: 'retry-later' });
  });

  it('no tid at all -> advise retry without a cache lookup', () => {
    const resolution = resolveDuplicatePendingOrder(order({ id: 'dup-3', pgToken: undefined }));
    expect(resolution).toEqual({ kind: 'retry-later' });
  });
});
