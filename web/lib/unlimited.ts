import type { Store } from './store';

// Unlimited-usage whitelist — any providerId in this set bypasses all paid gating.
// Add/remove here only.
// TODO(needs-owner-creds): populate with the owner's real Google provider ids (user_metadata.sub)
// once Google OAuth is wired. Empty by default so no one is unintentionally unlimited.
export const UNLIMITED_PROVIDER_IDS = new Set<string>([]);

export async function isUnlimitedUser(store: Store, userId: string): Promise<boolean> {
  const user = await store.getUser(userId);
  return user?.providerId != null && UNLIMITED_PROVIDER_IDS.has(user.providerId);
}
