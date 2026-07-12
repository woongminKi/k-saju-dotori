#!/usr/bin/env -S npx tsx
// One-off Polar product bootstrap. Given POLAR_ACCESS_TOKEN (and optionally POLAR_SERVER) in the
// environment, creates the 6 fixed-price products that back Dotori's credit packages and prints the
// POLAR_PRODUCT_ID_* env-var lines to stdout, ready to paste into web/.env.
//
// Usage (from the web/ directory):   POLAR_ACCESS_TOKEN=polar_... pnpm exec tsx tools/polar-setup.ts
//   optional: POLAR_SERVER=sandbox|production (default sandbox)
//
// Zero dependencies — raw fetch + node process env. NOT imported by the app (no 'server-only'); a
// standalone script. Prices/names are the single source of truth from ../lib/pricing.
//
// NOTE(needs-owner-creds / verify): the exact product-create request schema below (one-time product with a
// single fixed price) is per Polar's documented shape at authoring time — re-check against
// https://polar.sh/docs before the first live run, since the org-id requirement and price field names can
// change. This script has NOT been run against a live Polar account.
import { CREDIT_PACKAGES, ORACLE_PACKAGES, type ProductKind } from '../lib/pricing';

const PRODUCTION_BASE = 'https://api.polar.sh';
const SANDBOX_BASE = 'https://sandbox-api.polar.sh';

interface CatalogEntry {
  product: ProductKind;
  units: number;
  amountCents: number;
  name: string;
  /** Env var the app reads this product's UUID from (see services.ts / .env.example). */
  envVar: string;
}

/** Build the 6-product catalog straight from the pricing constants so names/prices never drift. */
function buildCatalog(): CatalogEntry[] {
  const reading = CREDIT_PACKAGES.map((p) => ({
    product: 'reading' as ProductKind,
    units: p.units,
    amountCents: p.amountCents,
    name: `Dotori Reading Credit ×${p.units}`,
    envVar: `POLAR_PRODUCT_ID_READING_${p.units}`,
  }));
  const oracle = ORACLE_PACKAGES.map((p) => ({
    product: 'oracle' as ProductKind,
    units: p.units,
    amountCents: p.amountCents,
    name: `Dotori Acorn Oracle ×${p.units}`,
    envVar: `POLAR_PRODUCT_ID_ORACLE_${p.units}`,
  }));
  return [...reading, ...oracle];
}

async function createProduct(baseUrl: string, token: string, entry: CatalogEntry): Promise<string> {
  const res = await fetch(`${baseUrl}/v1/products/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: entry.name,
      // One-time (non-recurring) purchase with a single fixed USD price (cents).
      recurring_interval: null,
      prices: [
        {
          amount_type: 'fixed',
          price_amount: entry.amountCents,
          price_currency: 'usd',
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to create "${entry.name}": ${res.status} ${body}`);
  }
  const json = (await res.json()) as { id?: string };
  if (!json.id) throw new Error(`Polar returned no product id for "${entry.name}".`);
  return json.id;
}

async function main(): Promise<void> {
  const token = process.env['POLAR_ACCESS_TOKEN'];
  if (!token) {
    console.error('POLAR_ACCESS_TOKEN is required (an organization access token).');
    process.exit(1);
    return;
  }
  const server = process.env['POLAR_SERVER'] === 'production' ? 'production' : 'sandbox';
  const baseUrl = server === 'production' ? PRODUCTION_BASE : SANDBOX_BASE;

  console.error(`Creating Dotori products on Polar (${server})...`);
  const catalog = buildCatalog();
  const lines: string[] = [];
  for (const entry of catalog) {
    const id = await createProduct(baseUrl, token, entry);
    console.error(`  created ${entry.name} ($${(entry.amountCents / 100).toFixed(2)}) -> ${id}`);
    lines.push(`${entry.envVar}=${id}`);
  }

  // Env-var lines go to stdout so the caller can pipe/paste them; progress goes to stderr above.
  console.log('\n# Paste these into web/.env:');
  console.log(lines.join('\n'));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
