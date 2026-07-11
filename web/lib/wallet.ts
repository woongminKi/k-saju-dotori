import type { Store } from './store';
import { READING_LEDGER_REASONS } from './store';
import { isUnlimitedUser } from './unlimited';

export async function balance(store: Store, userId: string): Promise<number> {
  if (await isUnlimitedUser(store, userId)) return Infinity;
  const entries = await store.ledgerFor(userId);
  return entries
    .filter((e) => (READING_LEDGER_REASONS as readonly string[]).includes(e.reason))
    .reduce((sum, e) => sum + e.delta, 0);
}

export async function topUp(store: Store, userId: string, units: number, ref?: string): Promise<void> {
  if (units <= 0) throw new Error('Top-up amount must be 1 or more.');
  await store.appendLedger({ userId, delta: units, reason: 'topup', ref, at: Date.now() });
}

export async function spend(store: Store, userId: string, ref?: string): Promise<void> {
  if (await isUnlimitedUser(store, userId)) return;
  const bal = await balance(store, userId);
  if (bal < 1) throw new Error('Not enough reading units.');
  await store.appendLedger({ userId, delta: -1, reason: 'spend', ref, at: Date.now() });
}

export async function refund(store: Store, userId: string, ref?: string): Promise<void> {
  await store.appendLedger({ userId, delta: 1, reason: 'refund', ref, at: Date.now() });
}

/**
 * Reclaim granted reading units on payment refund — same "check then deduct" shape as spend(),
 * but removes an arbitrary quantity (units). Throws if the balance is short (already partly used) —
 * partial-use refunds are not automated and are left to operator judgment.
 */
export async function reclaim(store: Store, userId: string, units: number, ref?: string): Promise<void> {
  if (units <= 0) throw new Error('Reclaim amount must be 1 or more.');
  if (await isUnlimitedUser(store, userId)) return; // same as spend() — unlimited users are a no-op, no ledger record
  const bal = await balance(store, userId);
  if (bal < units) throw new Error('Not enough remaining reading units to reclaim.');
  await store.appendLedger({ userId, delta: -units, reason: 'refund_reclaim', ref, at: Date.now() });
}
