import type { Store } from './store';
import { grantPoints } from './points';

export const REFERRAL_BONUS = 100;

export type ClaimResult =
  | { ok: true; referrerId: string }
  | { ok: false; reason: 'invalid_code' | 'self' | 'already_referred' };

export async function claimReferral(store: Store, refereeId: string, code: string): Promise<ClaimResult> {
  const referrer = await store.getUserByReferralCode(code);
  if (!referrer) return { ok: false, reason: 'invalid_code' };
  if (referrer.id === refereeId) return { ok: false, reason: 'self' };
  const won = await store.setReferredBy(refereeId, referrer.id);
  if (!won) return { ok: false, reason: 'already_referred' };
  await grantPoints(store, refereeId, REFERRAL_BONUS, 'referral_referee', referrer.id);
  await grantPoints(store, referrer.id, REFERRAL_BONUS, 'referral_referrer', refereeId);
  return { ok: true, referrerId: referrer.id };
}
