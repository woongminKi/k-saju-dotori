import type { Store } from './store';
import { ORACLE_LEDGER_REASONS } from './store';
import { isUnlimitedUser } from './unlimited';

// Oracle-draw credits — same ledger table as reading units, but the oracle_ reasons keep the balance separate.

export async function oracleBalance(store: Store, userId: string): Promise<number> {
  if (await isUnlimitedUser(store, userId)) return Infinity;
  const entries = await store.ledgerFor(userId);
  return entries
    .filter((e) => (ORACLE_LEDGER_REASONS as readonly string[]).includes(e.reason))
    .reduce((sum, e) => sum + e.delta, 0);
}

export async function oracleTopUp(
  store: Store, userId: string, units: number, ref?: string,
): Promise<void> {
  if (units <= 0) throw new Error('Top-up amount must be 1 or more.');
  await store.appendLedger({ userId, delta: units, reason: 'oracle_topup', ref, at: Date.now() });
}

export async function oracleSpend(store: Store, userId: string, ref?: string): Promise<void> {
  if (await isUnlimitedUser(store, userId)) return;
  const bal = await oracleBalance(store, userId);
  if (bal < 1) throw new Error('Not enough oracle credits.');
  await store.appendLedger({ userId, delta: -1, reason: 'oracle_spend', ref, at: Date.now() });
}

export async function oracleRefund(store: Store, userId: string, ref?: string): Promise<void> {
  await store.appendLedger({ userId, delta: 1, reason: 'oracle_refund', ref, at: Date.now() });
}

/** Reclaim granted oracle credits on payment refund — same policy as wallet.reclaim (throws if short). */
export async function oracleReclaim(store: Store, userId: string, units: number, ref?: string): Promise<void> {
  if (units <= 0) throw new Error('Reclaim amount must be 1 or more.');
  if (await isUnlimitedUser(store, userId)) return; // same as oracleSpend() — unlimited users are a no-op, no ledger record
  const bal = await oracleBalance(store, userId);
  if (bal < units) throw new Error('Not enough remaining oracle credits to reclaim.');
  await store.appendLedger({ userId, delta: -units, reason: 'oracle_refund_reclaim', ref, at: Date.now() });
}
