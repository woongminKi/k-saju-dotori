import { describe, it, expect, afterEach } from 'vitest';
import { InMemoryStore } from '../store';
import { balance, topUp, spend, refund, reclaim } from '../wallet';
import { UNLIMITED_PROVIDER_IDS } from '../unlimited';

const TEST_UNLIMITED_ID = 'test-unlimited-provider-id';

afterEach(() => {
  UNLIMITED_PROVIDER_IDS.delete(TEST_UNLIMITED_ID);
});

describe('wallet', () => {
  it('top-up -> spend -> refund balance math', async () => {
    const s = new InMemoryStore();
    expect(await balance(s, 'u1')).toBe(0);
    await topUp(s, 'u1', 3);
    expect(await balance(s, 'u1')).toBe(3);
    await spend(s, 'u1');
    expect(await balance(s, 'u1')).toBe(2);
    await refund(s, 'u1');
    expect(await balance(s, 'u1')).toBe(3);
  });

  it('spend throws when balance is insufficient', async () => {
    const s = new InMemoryStore();
    await expect(spend(s, 'u1')).rejects.toThrow();
  });

  it('top-up of 0 or less throws', async () => {
    const s = new InMemoryStore();
    await expect(topUp(s, 'u1', 0)).rejects.toThrow();
  });

  it('unlimited whitelist user: balance=Infinity, spend is a no-op (no ledger record)', async () => {
    const s = new InMemoryStore();
    UNLIMITED_PROVIDER_IDS.add(TEST_UNLIMITED_ID);
    await s.upsertUser({
      id: 'unlimited', providerId: TEST_UNLIMITED_ID, createdAt: 0, referralCode: 'DOTORI-TEST',
    });
    expect(await balance(s, 'unlimited')).toBe(Infinity);
    await spend(s, 'unlimited'); // does not throw even at 0 balance
    expect(await balance(s, 'unlimited')).toBe(Infinity); // no deduction recorded
  });

  it('reclaim — deducts granted units when balance is sufficient', async () => {
    const s = new InMemoryStore();
    await topUp(s, 'u1', 5);
    await reclaim(s, 'u1', 3, 'order-1');
    expect(await balance(s, 'u1')).toBe(2);
  });

  it('reclaim — throws when balance is short (already partly used), balance unchanged', async () => {
    const s = new InMemoryStore();
    await topUp(s, 'u1', 3);
    await spend(s, 'u1'); // 2 left
    await expect(reclaim(s, 'u1', 3, 'order-1')).rejects.toThrow(/enough/i);
    expect(await balance(s, 'u1')).toBe(2); // not reclaimed
  });

  it('reclaim — amount of 0 or less throws', async () => {
    const s = new InMemoryStore();
    await expect(reclaim(s, 'u1', 0, 'order-1')).rejects.toThrow();
  });

  it('reclaim — unlimited whitelist user is a no-op regardless of balance (no ledger record)', async () => {
    const s = new InMemoryStore();
    UNLIMITED_PROVIDER_IDS.add(TEST_UNLIMITED_ID);
    await s.upsertUser({
      id: 'unlimited', providerId: TEST_UNLIMITED_ID, createdAt: 0, referralCode: 'DOTORI-TEST2',
    });
    await reclaim(s, 'unlimited', 999, 'order-1'); // does not throw
    expect(await balance(s, 'unlimited')).toBe(Infinity); // no reclaim recorded
  });
});
