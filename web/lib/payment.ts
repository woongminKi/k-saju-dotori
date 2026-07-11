import 'server-only';
import { randomUUID } from 'node:crypto';
import type { Store } from './store';
import { findPackageFor, type ProductKind } from './pricing';
import { balance as walletBalance, topUp, reclaim } from './wallet';
import { oracleBalance, oracleTopUp, oracleReclaim } from './oracle-wallet';
import { spendPoints, pointsBalance, grantPoints } from './points';

/** Default settlement currency (ISO 4217, lowercase — matches Stripe convention). */
export const DEFAULT_CURRENCY = 'usd';

export interface ChargeRequest {
  userId: string;
  units: number;
  pointsApplied?: number;
  /** Defaults to 'reading' (reading units). */
  product?: ProductKind;
  /** True if the caller (User-Agent) is mobile. For PGs that branch mobile/desktop redirect URLs. */
  isMobile?: boolean;
}

/** Credit the product-specific balance on payment confirmation. */
export async function creditUnits(store: Store, order: { userId: string; units: number; id: string; product?: ProductKind }): Promise<void> {
  if (order.product === 'oracle') await oracleTopUp(store, order.userId, order.units, order.id);
  else await topUp(store, order.userId, order.units, order.id);
}

export interface ChargeResult {
  orderId: string;
  pgToken: string;
  /** Where to send the user for payment approval (real PG redirect slot). */
  redirectUrl: string;
  amountCents: number;
  currency: string;
}

export interface PaymentProvider {
  createCharge(req: ChargeRequest): Promise<ChargeResult>;
  confirm(orderId: string, pgToken?: string): Promise<{ orderId: string; userId: string; units: number }>;
  /** Cancel a pre-payment (pending) order — the user aborted before the approval callback. */
  cancel(orderId: string): Promise<void>;
  /**
   * Refund a completed (paid) order. Idempotent (no-op if already refunded).
   * Policy (basis for the "no refund on already-viewed content" rule): full refund only when the
   * granted units remain entirely unused in the balance — any partial use is rejected (operator handles manually).
   */
  refund(orderId: string): Promise<void>;
}

/**
 * Validate that a refund is reclaimable — the granted units are still unused in the balance.
 * Always call this BEFORE hitting the PG cancel API (avoids the PG side being canceled for an impossible refund).
 */
export async function assertRefundReclaimable(
  store: Store,
  order: { userId: string; units: number; product?: ProductKind },
): Promise<void> {
  const current = order.product === 'oracle'
    ? await oracleBalance(store, order.userId)
    : await walletBalance(store, order.userId);
  if (current < order.units) {
    throw new Error(
      `Refund not possible — some of the granted ${order.units} unit(s) have already been used (remaining ${current}). Partial refunds must be handled manually by an operator.`,
    );
  }
}

/**
 * Reclaim the granted units on refund (deduct units/credits + restore spent points). Call only from
 * the call that "won" the paid->refunded transition (prevents double reclaim on concurrent refunds —
 * same principle as markOrderPaid/settlePaid).
 * A reclaim failure is logged with the [REFUND_RECLAIM_FAILED] marker and rethrown — by this point the
 * PG refund and order transition are already done and irreversible, so surfacing it for manual handling is best.
 */
export async function reclaimRefund(
  store: Store,
  order: { id: string; userId: string; units: number; product?: ProductKind; pointsApplied?: number },
): Promise<void> {
  try {
    if (order.product === 'oracle') await oracleReclaim(store, order.userId, order.units, order.id);
    else await reclaim(store, order.userId, order.units, order.id);
    if (order.pointsApplied && order.pointsApplied > 0) {
      await grantPoints(store, order.userId, order.pointsApplied, 'refund_restore', order.id);
    }
  } catch (error) {
    console.error('[REFUND_RECLAIM_FAILED]', {
      orderId: order.id,
      userId: order.userId,
      product: order.product,
      units: order.units,
      pointsApplied: order.pointsApplied,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Dev-only stub — instant approval. To be replaced by a real Stripe adapter in Phase 5.
 * The KakaoPay adapter from the Korean app is intentionally NOT ported.
 */
export class StubPaymentProvider implements PaymentProvider {
  constructor(private store: Store) {}

  async createCharge({ userId, units, pointsApplied, product = 'reading' }: ChargeRequest): Promise<ChargeResult> {
    const pkg = findPackageFor(product, units);
    const orderId = randomUUID();
    const pgToken = randomUUID();
    await this.store.createOrder({
      id: orderId,
      userId,
      units: pkg.units,
      amountCents: pkg.amountCents,
      currency: DEFAULT_CURRENCY,
      status: 'pending',
      pgToken,
      pointsApplied: pointsApplied && pointsApplied > 0 ? pointsApplied : undefined,
      product,
      createdAt: Date.now(),
    });
    return {
      orderId,
      pgToken,
      redirectUrl: `/api/checkout/approve?orderId=${orderId}`,
      amountCents: pkg.amountCents,
      currency: DEFAULT_CURRENCY,
    };
  }

  async confirm(orderId: string): Promise<{ orderId: string; userId: string; units: number }> {
    const order = await this.store.getOrder(orderId);
    if (!order) throw new Error('Order not found.');
    if (order.status === 'paid') {
      return { orderId: order.id, userId: order.userId, units: order.units }; // idempotent
    }
    if (order.status !== 'pending') throw new Error(`Cannot confirm in state: ${order.status}`);
    // Re-check the points balance before marking paid. Prevents the "not charged + marked failed"
    // corruption where the balance drops between validation and confirm.
    if (order.pointsApplied && order.pointsApplied > 0) {
      const bal = await pointsBalance(this.store, order.userId);
      if (bal < order.pointsApplied) throw new Error('Not enough points.');
    }
    // pending -> paid atomic transition prevents concurrent-confirm double credit. Only the winner credits.
    const won = await this.store.markOrderPaid(order.id);
    if (won) {
      await creditUnits(this.store, order);
      if (order.pointsApplied && order.pointsApplied > 0) {
        await spendPoints(this.store, order.userId, order.pointsApplied, order.id);
      }
    }
    return { orderId: order.id, userId: order.userId, units: order.units };
  }

  async cancel(orderId: string): Promise<void> {
    // Existence check is delegated to markOrderCanceled (saves a round-trip) — missing order throws
    // there, not-pending is a silent no-op (atomic guard).
    await this.store.markOrderCanceled(orderId);
  }

  async refund(orderId: string): Promise<void> {
    const order = await this.store.getOrder(orderId);
    if (!order) throw new Error('Order not found.');
    if (order.status !== 'paid') return; // idempotent — refunded or not-paid is a no-op

    await assertRefundReclaimable(this.store, order); // the stub applies the same policy as the real adapter

    const won = await this.store.markOrderRefunded(order.id);
    if (!won) return; // concurrent refund — another call already handled it

    await reclaimRefund(this.store, order);
  }
}
