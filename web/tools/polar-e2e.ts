#!/usr/bin/env -S npx tsx
// Polar sandbox payment E2E probe — drives the REAL provider against the REAL sandbox + Supabase.
// The missing leg of P5-C (hosted-checkout completion) is done by a human/headless browser; this script
// covers everything around it: order creation, settlement check, refund, inspection, cleanup.
//
// Usage (from web/):
//   NODE_OPTIONS=--conditions=react-server pnpm exec tsx tools/polar-e2e.ts create
//   NODE_OPTIONS=--conditions=react-server pnpm exec tsx tools/polar-e2e.ts confirm <orderId>
//   NODE_OPTIONS=--conditions=react-server pnpm exec tsx tools/polar-e2e.ts refund <orderId>
//   NODE_OPTIONS=--conditions=react-server pnpm exec tsx tools/polar-e2e.ts inspect <userId>
//   NODE_OPTIONS=--conditions=react-server pnpm exec tsx tools/polar-e2e.ts cleanup <userId>
//
// --conditions=react-server neutralizes the 'server-only' import guards outside Next's runtime.
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

// Load web/.env without a dotenv dependency (KEY=VALUE lines only; existing process env wins).
const envUrl = new URL('../.env', import.meta.url);
for (const line of readFileSync(envUrl, 'utf8').split('\n')) {
  const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && process.env[m[1]!] === undefined) process.env[m[1]!] = m[2]!;
}

const { createClient } = await import('@supabase/supabase-js');
const { SupabaseStore } = await import('../lib/store-supabase');
const { PolarPaymentProvider } = await import('../lib/payment-polar');

const sb = createClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { persistSession: false } },
);
const store = new SupabaseStore(sb);
const provider = new PolarPaymentProvider(store, {
  accessToken: process.env['POLAR_ACCESS_TOKEN']!,
  server: (process.env['POLAR_SERVER'] as 'sandbox' | 'production') ?? 'sandbox',
  siteUrl: process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000',
  productIds: {
    'reading:1': process.env['POLAR_PRODUCT_ID_READING_1']!,
    'reading:3': process.env['POLAR_PRODUCT_ID_READING_3']!,
    'reading:5': process.env['POLAR_PRODUCT_ID_READING_5']!,
    'oracle:12': process.env['POLAR_PRODUCT_ID_ORACLE_12']!,
    'oracle:30': process.env['POLAR_PRODUCT_ID_ORACLE_30']!,
    'oracle:80': process.env['POLAR_PRODUCT_ID_ORACLE_80']!,
  },
});

const [cmd, arg] = process.argv.slice(2);

async function inspect(userId: string) {
  const { data: orders } = await sb.from('orders').select('id,status,units,amount_cents,currency,product').eq('user_id', userId);
  const { data: ledger } = await sb.from('ledger').select('delta,reason,ref').eq('user_id', userId);
  console.log('orders:', JSON.stringify(orders));
  console.log('ledger:', JSON.stringify(ledger));
}

if (cmd === 'create') {
  const userId = randomUUID();
  const { error } = await sb.from('users').insert({ id: userId, referral_code: `DOTORI-E2E${Date.now() % 10000}` });
  if (error) throw new Error(`test user insert failed: ${error.message}`);
  const res = await provider.createCharge({ userId, units: 12, product: 'oracle' });
  console.log(JSON.stringify({ userId, ...res }, null, 2));
} else if (cmd === 'confirm') {
  const res = await provider.confirm(arg!);
  console.log('confirm:', JSON.stringify(res));
} else if (cmd === 'refund') {
  await provider.refund(arg!);
  console.log('refund: ok');
} else if (cmd === 'inspect') {
  await inspect(arg!);
} else if (cmd === 'cleanup') {
  await sb.from('ledger').delete().eq('user_id', arg!);
  await sb.from('orders').delete().eq('user_id', arg!);
  await sb.from('users').delete().eq('id', arg!);
  console.log('cleanup: done');
} else {
  console.log('usage: polar-e2e.ts create|confirm|refund|inspect|cleanup [id]');
  process.exit(1);
}
