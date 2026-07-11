import { describe, it, expect, afterEach } from 'vitest';
import { InMemoryStore } from '../store';
import { oracleBalance, oracleTopUp, oracleSpend, oracleReclaim } from '../oracle-wallet';
import { UNLIMITED_PROVIDER_IDS } from '../unlimited';

const TEST_UNLIMITED_ID = 'test-unlimited-provider-id';

afterEach(() => {
  UNLIMITED_PROVIDER_IDS.delete(TEST_UNLIMITED_ID);
});

describe('oracle-wallet reclaim', () => {
  it('reclaims granted credits on refund when balance is sufficient', async () => {
    const s = new InMemoryStore();
    await oracleTopUp(s, 'u1', 5);
    await oracleReclaim(s, 'u1', 3, 'order-1');
    expect(await oracleBalance(s, 'u1')).toBe(2);
  });

  it('throws when balance is short (already partly used), balance unchanged', async () => {
    const s = new InMemoryStore();
    await oracleTopUp(s, 'u1', 3);
    await oracleSpend(s, 'u1');
    await expect(oracleReclaim(s, 'u1', 3, 'order-1')).rejects.toThrow(/enough/i);
    expect(await oracleBalance(s, 'u1')).toBe(2);
  });

  it('amount of 0 or less throws', async () => {
    const s = new InMemoryStore();
    await expect(oracleReclaim(s, 'u1', 0, 'order-1')).rejects.toThrow();
  });

  it('unlimited whitelist user is a no-op regardless of balance (no ledger record)', async () => {
    const s = new InMemoryStore();
    UNLIMITED_PROVIDER_IDS.add(TEST_UNLIMITED_ID);
    await s.upsertUser({
      id: 'unlimited', providerId: TEST_UNLIMITED_ID, createdAt: 0, referralCode: 'DOTORI-TEST3',
    });
    await oracleReclaim(s, 'unlimited', 999, 'order-1');
    expect(await oracleBalance(s, 'unlimited')).toBe(Infinity);
  });
});
