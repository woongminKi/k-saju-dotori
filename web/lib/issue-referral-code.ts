import type { Store } from './store';
import { generateReferralCode } from './referral-code';

/**
 * Issues a referral code that does not collide with the store. With random 4 chars (32^4),
 * collision odds rise as users grow, so retry to avoid a DB UNIQUE violation surfacing as a 500.
 */
export async function issueReferralCode(store: Store): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateReferralCode();
    if (!(await store.getUserByReferralCode(code))) return code;
  }
  throw new Error('Failed to issue a referral code: repeated collisions');
}
