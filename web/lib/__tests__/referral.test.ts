import { describe, it, expect } from 'vitest';
import { InMemoryStore } from '../store';
import { claimReferral, REFERRAL_BONUS } from '../referral';
import { pointsBalance } from '../points';

async function seed() {
  const s = new InMemoryStore();
  await s.upsertUser({ id: 'ref', createdAt: 1, referralCode: 'DOTORI-REF0' });
  await s.upsertUser({ id: 'newbie', createdAt: 2, referralCode: 'DOTORI-NEW0' });
  return s;
}

describe('claimReferral', () => {
  it('happy path — +100 to both sides, referredBy set', async () => {
    const s = await seed();
    const res = await claimReferral(s, 'newbie', 'DOTORI-REF0');
    expect(res).toEqual({ ok: true, referrerId: 'ref' });
    expect(await pointsBalance(s, 'newbie')).toBe(REFERRAL_BONUS);
    expect(await pointsBalance(s, 'ref')).toBe(REFERRAL_BONUS);
    expect((await s.getUser('newbie'))?.referredBy).toBe('ref');
  });

  it('invalid code — no grant', async () => {
    const s = await seed();
    const res = await claimReferral(s, 'newbie', 'DOTORI-XXXX');
    expect(res).toEqual({ ok: false, reason: 'invalid_code' });
    expect(await pointsBalance(s, 'newbie')).toBe(0);
  });

  it('self-referral — rejected', async () => {
    const s = await seed();
    const res = await claimReferral(s, 'ref', 'DOTORI-REF0');
    expect(res).toEqual({ ok: false, reason: 'self' });
    expect(await pointsBalance(s, 'ref')).toBe(0);
  });

  it('already referred — rejected, no re-grant', async () => {
    const s = await seed();
    await claimReferral(s, 'newbie', 'DOTORI-REF0');
    const res = await claimReferral(s, 'newbie', 'DOTORI-REF0');
    expect(res).toEqual({ ok: false, reason: 'already_referred' });
    expect(await pointsBalance(s, 'newbie')).toBe(REFERRAL_BONUS);
  });

  it('concurrent claim — granted exactly once', async () => {
    const s = await seed();
    const [a, b] = await Promise.all([
      claimReferral(s, 'newbie', 'DOTORI-REF0'),
      claimReferral(s, 'newbie', 'DOTORI-REF0'),
    ]);
    const oks = [a, b].filter((r) => r.ok);
    expect(oks).toHaveLength(1);
    expect(await pointsBalance(s, 'newbie')).toBe(REFERRAL_BONUS);
    expect(await pointsBalance(s, 'ref')).toBe(REFERRAL_BONUS);
  });
});
