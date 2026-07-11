import type { Order } from './store';
import type { ProductKind } from './pricing';

/** Retry double-charge guard window. Must be shorter than reconcile's stale threshold (20 min) so they don't overlap. */
export const CHECKOUT_RETRY_GUARD_MS = 10 * 60 * 1000;

/**
 * Among recent pending orders, only one with the exact same purchase intent (product, units, points
 * applied) counts as a "duplicate retry". Same product but different units/pointsApplied means the
 * user deliberately picked a different package, so it must not be reused — this avoids approving an
 * existing order for the wrong amount.
 *
 * Best-effort limitation: this guard only blocks "sequential retries" (waited for a response then
 * clicked again, retried after a timeout, etc.). Two nearly-simultaneous requests that both pass the
 * pendingOrdersForUserSince lookup first (check-then-act race) are not caught here — the DB partial
 * unique index (orders_pending_dedup_idx, user_id+product+units+points_applied where status='pending')
 * provides the DB-level defense (the code supports both states — createOrder throws
 * DuplicatePendingOrderError on violation, and the checkout route joins the existing order).
 * With multiple candidates, deterministically pick the most recent (createdAt desc).
 */
export function findDuplicatePendingOrder(
  recentPending: Order[],
  product: ProductKind,
  units: number,
  pointsApplied: number,
): Order | undefined {
  const candidates = recentPending.filter(
    (o) =>
      (o.product ?? 'reading') === product &&
      o.units === units &&
      (o.pointsApplied ?? 0) === pointsApplied,
  );
  if (candidates.length === 0) return undefined;
  return candidates.reduce((latest, o) => (o.createdAt > latest.createdAt ? o : latest));
}

export interface CachedRedirect {
  url: string;
  at: number;
}

// orderId->redirectUrl cache for the retry double-charge guard (process-global). Kept on globalThis
// for the same reason as services.ts's globalThis caching (per-route server bundles may not share
// module scope). A cache miss (routed to a different server instance, etc.) safely falls back to
// creating a new order, so it doesn't affect correctness.
const g = globalThis as typeof globalThis & { __dotoriCheckoutRedirects?: Map<string, CachedRedirect> };
g.__dotoriCheckoutRedirects ??= new Map();
export const redirectCache: Map<string, CachedRedirect> = g.__dotoriCheckoutRedirects;

/** Lazily prune cache entries older than the guard window (CHECKOUT_RETRY_GUARD_MS) — no timer, cleaned on read/insert. */
export function pruneRedirectCache(now: number = Date.now()): void {
  for (const [id, entry] of redirectCache) {
    if (now - entry.at > CHECKOUT_RETRY_GUARD_MS) redirectCache.delete(id);
  }
}

export type DuplicateOrderResolution =
  | { kind: 'reuse'; redirectUrl: string }
  | { kind: 'retry-later' };

/**
 * Decides how to respond when createOrder throws DuplicatePendingOrderError (DB unique constraint).
 * If the cache has a redirectUrl, reuse it; otherwise (cache didn't reach this server instance, or
 * there's no tid yet) do not cancel/reissue — the existingOrder here may belong to another in-flight
 * request, and canceling it could let that request later attach a pgToken to an already-canceled
 * order and process a payment against it. Safely advise a retry instead.
 */
export function resolveDuplicatePendingOrder(existingOrder: Order): DuplicateOrderResolution {
  const cachedUrl = existingOrder.pgToken ? redirectCache.get(existingOrder.id)?.url : undefined;
  if (cachedUrl) return { kind: 'reuse', redirectUrl: cachedUrl };
  return { kind: 'retry-later' };
}
