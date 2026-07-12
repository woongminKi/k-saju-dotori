import 'server-only';
import { InMemoryStore } from './store';
import { SupabaseStore } from './store-supabase';
import { StubAuthProvider } from './auth';
import { SupabaseAuthProvider } from './auth-supabase';
import { supabaseAdmin } from './supabase-admin';
import type { Store } from './store';
import type { AuthProvider } from './auth';
import { StubPaymentProvider } from './payment';
import { StripePaymentProvider } from './payment-stripe';
import { PolarPaymentProvider } from './payment-polar';
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

// Real-payment mode when both Stripe server secrets are present. Half-configured state errors immediately
// (same both-or-neither guard as useSupabase). The publishable key is client-side only, not checked here.
// NOTE: Stripe is now the DORMANT fallback (superseded by Polar) — kept for a possible future revival if a
// US business entity ever exists. Polar takes precedence when configured (see getPayment).
function stripeConfigured(): boolean {
  const secretKey = process.env['STRIPE_SECRET_KEY'];
  const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];
  if (secretKey && webhookSecret) return true;
  if (secretKey || webhookSecret) {
    throw new Error('Stripe config incomplete: both STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are required');
  }
  return false;
}

// Real-payment mode (primary) when both Polar secrets are present. Same both-or-neither guard. Polar is a
// Merchant of Record that officially supports South Korea sellers with a review-free sandbox — the reason it
// supersedes Stripe (which needs a US entity the owner doesn't have).
function polarConfigured(): boolean {
  const accessToken = process.env['POLAR_ACCESS_TOKEN'];
  const webhookSecret = process.env['POLAR_WEBHOOK_SECRET'];
  if (accessToken && webhookSecret) return true;
  if (accessToken || webhookSecret) {
    throw new Error('Polar config incomplete: both POLAR_ACCESS_TOKEN and POLAR_WEBHOOK_SECRET are required');
  }
  return false;
}

/** Read the 6 Polar product-id env vars into the `${product}:${units}` map PolarPaymentProvider expects. */
function polarProductIds(): Record<string, string> {
  return {
    'reading:1': process.env['POLAR_PRODUCT_ID_READING_1'] ?? '',
    'reading:3': process.env['POLAR_PRODUCT_ID_READING_3'] ?? '',
    'reading:5': process.env['POLAR_PRODUCT_ID_READING_5'] ?? '',
    'oracle:12': process.env['POLAR_PRODUCT_ID_ORACLE_12'] ?? '',
    'oracle:30': process.env['POLAR_PRODUCT_ID_ORACLE_30'] ?? '',
    'oracle:80': process.env['POLAR_PRODUCT_ID_ORACLE_80'] ?? '',
  };
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
  // 3-way provider precedence (highest to lowest):
  //   1. Polar   — primary real-payment provider (Merchant of Record, supports Korea, review-free sandbox).
  //   2. Stripe  — DORMANT fallback, only if Polar is unconfigured (kept for a possible future US-entity revival).
  //   3. Stub    — dev/preview instant-approval when neither PG is configured.
  // Each configured*() call is a both-or-neither guard that throws on a half-configured state.
  g.__dotoriPayment ??= polarConfigured()
    ? new PolarPaymentProvider(getStore(), {
        accessToken: process.env['POLAR_ACCESS_TOKEN']!,
        server: process.env['POLAR_SERVER'] === 'production' ? 'production' : 'sandbox',
        siteUrl: process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000',
        productIds: polarProductIds(),
      })
    : stripeConfigured()
      ? new StripePaymentProvider(getStore(), {
          secretKey: process.env['STRIPE_SECRET_KEY']!,
          siteUrl: process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000',
        })
      : new StubPaymentProvider(getStore());
  return g.__dotoriPayment;
}
