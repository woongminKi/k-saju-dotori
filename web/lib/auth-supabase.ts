import 'server-only';
import type { AuthProvider } from './auth';
import type { Store, User } from './store';
import { supabaseServer } from './supabase-ssr';
import { issueReferralCode } from './issue-referral-code';

export class SupabaseAuthProvider implements AuthProvider {
  constructor(private store: Store) {}

  async getCurrentUser(): Promise<User | undefined> {
    const sb = await supabaseServer();
    const { data } = await sb.auth.getUser();
    const authUser = data.user;
    if (!authUser) return undefined;

    const existing = await this.store.getUser(authUser.id);
    if (existing) return existing;

    // First login -> create the profile row. Google account id lives in the provider metadata.
    const providerId =
      (authUser.user_metadata?.['provider_id'] as string | undefined) ??
      (authUser.user_metadata?.['sub'] as string | undefined);
    const user: User = { id: authUser.id, providerId, createdAt: Date.now(), referralCode: await issueReferralCode(this.store) };
    await this.store.upsertUser(user);
    return user;
  }
}
