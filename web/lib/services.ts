import 'server-only';
import { InMemoryStore } from './store';
import { SupabaseStore } from './store-supabase';
import { StubAuthProvider } from './auth';
import { SupabaseAuthProvider } from './auth-supabase';
import { supabaseAdmin } from './supabase-admin';
import type { Store } from './store';
import type { AuthProvider } from './auth';
import { StubPaymentProvider } from './payment';
import type { PaymentProvider } from './payment';

// Backend selection by env presence. An ambiguous half-configured state errors immediately.
function useSupabase(): boolean {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (url && key) return true;
  if (url || key) {
    throw new Error('Supabase config incomplete: both NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  return false;
}

// Next.js per-route server bundles may not share module scope (fatal for the InMemory stub), so we
// cache on globalThis to make every route see the same instance. The Supabase path is unaffected
// since its state lives in the DB.
const g = globalThis as typeof globalThis & {
  __dotoriStore?: Store;
  __dotoriAuth?: AuthProvider;
  __dotoriPayment?: PaymentProvider;
};

export function getStore(): Store {
  g.__dotoriStore ??= useSupabase() ? new SupabaseStore(supabaseAdmin()) : new InMemoryStore();
  return g.__dotoriStore;
}
export function getAuth(): AuthProvider {
  g.__dotoriAuth ??= useSupabase() ? new SupabaseAuthProvider(getStore()) : new StubAuthProvider(getStore());
  return g.__dotoriAuth;
}
export function getPayment(): PaymentProvider {
  // TODO(Phase 5): select a real StripePaymentProvider when Stripe env is configured. Until then
  // only the stub provider exists (Stripe integration is deferred to Phase 5).
  g.__dotoriPayment ??= new StubPaymentProvider(getStore());
  return g.__dotoriPayment;
}
