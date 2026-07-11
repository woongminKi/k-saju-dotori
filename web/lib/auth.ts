import 'server-only';
import type { Store, User } from './store';
import { issueReferralCode } from './issue-referral-code';

export interface AuthProvider {
  /** The logged-in user. undefined if not logged in. */
  getCurrentUser(): Promise<User | undefined>;
}

/** Dev-only stub — a fixed user. Replaced later by the real Google OAuth adapter. */
export class StubAuthProvider implements AuthProvider {
  constructor(
    private store: Store,
    private userId = 'dev-user',
  ) {}

  async getCurrentUser(): Promise<User> {
    let user = await this.store.getUser(this.userId);
    if (!user) {
      user = { id: this.userId, createdAt: Date.now(), referralCode: await issueReferralCode(this.store) };
      await this.store.upsertUser(user);
    }
    return user;
  }
}
