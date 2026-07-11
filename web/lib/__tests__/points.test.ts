import { describe, it, expect } from 'vitest';
import { InMemoryStore } from '../store';
import { pointsBalance, grantPoints, spendPoints } from '../points';

describe('points', () => {
  it('balance = sum of deltas', async () => {
    const s = new InMemoryStore();
    expect(await pointsBalance(s, 'u1')).toBe(0);
    await grantPoints(s, 'u1', 100, 'referral_referee', 'ref');
    await grantPoints(s, 'u1', 100, 'referral_referrer', 'x');
    expect(await pointsBalance(s, 'u1')).toBe(200);
  });

  it('spendPoints — deducts balance, records a negative delta', async () => {
    const s = new InMemoryStore();
    await grantPoints(s, 'u1', 100, 'referral_referee', 'ref');
    await spendPoints(s, 'u1', 30, 'o1');
    expect(await pointsBalance(s, 'u1')).toBe(70);
  });

  it('grantPoints — rejects 0 or less', async () => {
    const s = new InMemoryStore();
    await expect(grantPoints(s, 'u1', 0, 'referral_referee', 'ref')).rejects.toThrow();
  });

  it('spendPoints — rejects spending more than the balance', async () => {
    const s = new InMemoryStore();
    await grantPoints(s, 'u1', 50, 'referral_referee', 'ref');
    await expect(spendPoints(s, 'u1', 60, 'o1')).rejects.toThrow();
  });

  it('spendPoints — rejects 0 or less', async () => {
    const s = new InMemoryStore();
    await expect(spendPoints(s, 'u1', 0, 'o1')).rejects.toThrow();
  });
});
