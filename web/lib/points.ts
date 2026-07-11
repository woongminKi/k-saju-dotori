import type { Store, PointsReason } from './store';

export async function pointsBalance(store: Store, userId: string): Promise<number> {
  const entries = await store.pointsFor(userId);
  return entries.reduce((sum, e) => sum + e.delta, 0);
}

export async function grantPoints(
  store: Store, userId: string, amount: number, reason: PointsReason, ref?: string,
): Promise<void> {
  if (amount <= 0) throw new Error('Granted points must be 1 or more.');
  await store.appendPoints({ userId, delta: amount, reason, ref, at: Date.now() });
}

export async function spendPoints(
  store: Store, userId: string, amount: number, orderId: string,
): Promise<void> {
  if (amount <= 0) throw new Error('Spent points must be 1 or more.');
  const bal = await pointsBalance(store, userId);
  if (bal < amount) throw new Error('Not enough points.');
  await store.appendPoints({ userId, delta: -amount, reason: 'spend_topup', ref: orderId, at: Date.now() });
}
