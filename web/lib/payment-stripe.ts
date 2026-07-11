// TODO(needs-owner-creds): verify against a real Stripe test-mode checkout + webhook once STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET are provided
import 'server-only';
import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import type { Order, Store } from './store';
import {
  creditUnits, assertRefundReclaimable, reclaimRefund, DEFAULT_CURRENCY,
  type ChargeRequest, type ChargeResult, type PaymentProvider,
} from './payment';
import { findPackageFor } from './pricing';
import { spendPoints, pointsBalance } from './points';

export interface StripeOptions {
  secretKey: string;
  siteUrl: string;
}

export interface ReconcileResult {
  /** pending + tokened orders inspected this sweep. */
  checked: number;
  /** Orders settled (Stripe session complete + paid). */
  paid: number;
  /** Orders canceled (Stripe session expired before payment). */
  canceled: number;
}

/** Stripe Checkout adapter (Checkout Sessions + webhooks). Constructed only when Stripe is configured. */
export class StripePaymentProvider implements PaymentProvider {
  private stripe: Stripe;

  constructor(
    private store: Store,
    private opts: StripeOptions,
  ) {
    // Lazy construction (inside the class, never at import time) so the module is import-safe
    // without a key — the provider is only instantiated when stripeConfigured() is true.
    this.stripe = new Stripe(opts.secretKey);
  }

  async createCharge({ userId, units, pointsApplied, product = 'reading' }: ChargeRequest): Promise<ChargeResult> {
    const pkg = findPackageFor(product, units);
    const charge = pkg.amountCents - (pointsApplied ?? 0);
    if (charge < 0) throw new Error('Applied points exceed the charge amount.');

    const orderId = randomUUID();
    await this.store.createOrder({
      id: orderId,
      userId,
      units: pkg.units,
      amountCents: pkg.amountCents,
      currency: DEFAULT_CURRENCY,
      status: 'pending',
      pointsApplied: pointsApplied && pointsApplied > 0 ? pointsApplied : undefined,
      product,
      createdAt: Date.now(),
    });

    // Full points coverage — no money changes hands, so we never touch Stripe. Settle via the same
    // approve route the paid path uses (no session id → confirm's zero-charge branch settles it).
    if (charge === 0) {
      return {
        orderId,
        pgToken: '',
        redirectUrl: `${this.opts.siteUrl}/api/checkout/approve?orderId=${orderId}`,
        amountCents: pkg.amountCents,
        currency: DEFAULT_CURRENCY,
      };
    }

    const itemName = product === 'oracle' ? `Oracle Credit ×${pkg.units}` : `Reading Credit ×${pkg.units}`;
    let session: Stripe.Checkout.Session;
    try {
      session = await this.stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{
          quantity: 1,
          price_data: {
            currency: DEFAULT_CURRENCY,
            unit_amount: charge,
            product_data: { name: itemName },
          },
        }],
        // client_reference_id is the dedicated top-level field for tying a checkout to our own order.
        // metadata.orderId is a redundant fallback the webhook also reads; the rest is context for
        // Dashboard triage and the charge.refunded reconciliation lookup (Stripe metadata is string-only).
        client_reference_id: orderId,
        metadata: { orderId, userId, product, units: String(pkg.units) },
        success_url: `${this.opts.siteUrl}/api/checkout/approve?orderId=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.opts.siteUrl}/checkout/cancel?orderId=${orderId}`,
      });
    } catch (error) {
      // Leaving the order pending would block a same-package retry via the dedup unique index —
      // transition it to failed so the user can retry immediately (no-op silently ignored; original error wins).
      console.error('[payment-stripe] checkout session create failed', {
        orderId,
        error: error instanceof Error ? error.message : String(error),
      });
      await this.store.markOrderFailed(orderId).catch((cleanupError) => {
        // Best-effort cleanup — the original error still wins (thrown below). Log the swallowed
        // cleanup failure so a stuck-pending order (blocks same-package retry) is traceable.
        console.error('[payment-stripe] markOrderFailed cleanup failed', {
          orderId,
          error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
        });
      });
      throw error;
    }

    if (!session.url) {
      await this.store.markOrderFailed(orderId).catch((cleanupError) => {
        console.error('[payment-stripe] markOrderFailed cleanup failed', {
          orderId,
          error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
        });
      });
      throw new Error('Stripe did not return a checkout URL.');
    }

    await this.store.updateOrder(orderId, { pgToken: session.id });

    return {
      orderId,
      pgToken: session.id,
      redirectUrl: session.url,
      amountCents: pkg.amountCents,
      currency: DEFAULT_CURRENCY,
    };
  }

  /** pending -> paid settlement, shared by confirm() and reconcilePending(). Only the winner credits. */
  private async settlePaid(order: Order): Promise<void> {
    const won = await this.store.markOrderPaid(order.id);
    if (!won) return;
    try {
      // Spend points before crediting units. spendPoints validates the balance first, so an insufficient
      // balance throws before creditUnits runs — prevents "units granted but points not spent".
      if (order.pointsApplied && order.pointsApplied > 0) {
        await spendPoints(this.store, order.userId, order.pointsApplied, order.id);
      }
      await creditUnits(this.store, order);
    } catch (error) {
      // The order is already paid here — a credit failure means charged-but-not-granted. Log with a
      // searchable marker for manual remediation (auto-refund/retry is out of scope).
      console.error('[PAYMENT_CREDIT_FAILED]', {
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

  async confirm(orderId: string, pgToken?: string): Promise<{ orderId: string; userId: string; units: number }> {
    const order = await this.store.getOrder(orderId);
    if (!order) throw new Error('Order not found.');
    if (order.status === 'paid') {
      return { orderId: order.id, userId: order.userId, units: order.units }; // idempotent
    }
    if (order.status !== 'pending') throw new Error(`Cannot confirm in state: ${order.status}`);
    if (order.pointsApplied && order.pointsApplied > 0) {
      const bal = await pointsBalance(this.store, order.userId);
      if (bal < order.pointsApplied) throw new Error('Not enough points.');
    }

    const charge = order.amountCents - (order.pointsApplied ?? 0);
    if (charge < 0) throw new Error('The charge amount is invalid.');
    if (charge > 0) {
      // Trust the session id we stored at createCharge over the caller-supplied one: it defends against
      // a forged session_id in the approve callback. For a legitimate call both are identical anyway.
      const sessionId = order.pgToken || pgToken;
      if (!sessionId) throw new Error('No Stripe session for this order.');
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid') throw new Error('Payment is not completed.');
      // Defense-in-depth: the amount Stripe actually collected must match what we expected to charge.
      if (session.amount_total !== charge) throw new Error('The charged amount does not match.');
    }

    // pending -> paid atomic transition prevents concurrent-confirm double credit. Only the winner credits.
    await this.settlePaid(order);
    return { orderId: order.id, userId: order.userId, units: order.units };
  }

  async cancel(orderId: string): Promise<void> {
    const order = await this.store.getOrder(orderId);
    if (!order) throw new Error('Order not found.');
    // Best-effort expire the Checkout Session so it can no longer be paid after cancellation. A session
    // that is already expired/completed throws at Stripe — swallow it: expiring is a courtesy, the
    // markOrderCanceled transition below is the real cancellation and must never fail on a Stripe error.
    // Zero-charge (points-only) orders have no session (empty pgToken) — nothing to expire.
    if (order.pgToken) {
      try {
        await this.stripe.checkout.sessions.expire(order.pgToken);
      } catch (error) {
        console.error('[payment-stripe] session expire failed', {
          orderId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    // not-pending is a silent no-op (atomic guard).
    await this.store.markOrderCanceled(orderId);
  }

  async refund(orderId: string): Promise<void> {
    const order = await this.store.getOrder(orderId);
    if (!order) throw new Error('Order not found.');
    if (order.status !== 'paid') return; // idempotent — refunded or not-paid is a no-op

    // 1. Reclaimability check FIRST — before touching Stripe. If any unit was used, throw here and
    //    leave the Stripe charge intact.
    await assertRefundReclaimable(this.store, order);

    // 2. Refund at Stripe. Zero-charge (points-only) orders have no Stripe payment to reverse.
    const charge = order.amountCents - (order.pointsApplied ?? 0);
    if (charge > 0) {
      if (!order.pgToken) throw new Error('No Stripe session to refund.');
      const session = await this.stripe.checkout.sessions.retrieve(order.pgToken, {
        expand: ['payment_intent'],
      });
      const pi = session.payment_intent;
      const paymentIntentId = typeof pi === 'string' ? pi : pi?.id;
      if (!paymentIntentId) throw new Error('No payment intent to refund.');
      await this.stripe.refunds.create({ payment_intent: paymentIntentId });
    }

    // 3. paid -> refunded atomic transition. Only the winner reclaims (prevents double reclaim).
    const won = await this.store.markOrderRefunded(order.id);
    if (!won) return;

    // 4. Reclaim the granted units + restore spent points.
    await reclaimRefund(this.store, order);
  }

  /**
   * Sync internal state after an operator refunded a charge directly in the Stripe Dashboard — the money
   * is ALREADY reversed at Stripe (we did NOT call refunds.create ourselves), so unlike refund() there is
   * no Stripe call to guard and nothing to roll back. Driven by the charge.refunded webhook.
   */
  async reclaimDashboardRefund(orderId: string): Promise<void> {
    const order = await this.store.getOrder(orderId);
    if (!order) throw new Error('Order not found.');
    if (order.status !== 'paid') return; // already refunded via our refund() path, or was never paid

    // If some granted units were already used we cannot claw back consumed credits — but the Stripe-side
    // refund stands regardless of whether we can reclaim. Log for manual handling and return: this must
    // never throw uncaught from a webhook handler (there is no earlier Stripe call to have "not happened").
    try {
      await assertRefundReclaimable(this.store, order);
    } catch (error) {
      console.error('[DASHBOARD_REFUND_RECLAIM_FAILED]', {
        orderId: order.id,
        userId: order.userId,
        product: order.product,
        units: order.units,
        pointsApplied: order.pointsApplied,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    // paid -> refunded atomic transition. Only the winner reclaims. No Stripe API call — the refund
    // already happened via the Dashboard.
    const won = await this.store.markOrderRefunded(order.id);
    if (!won) return;
    await reclaimRefund(this.store, order);
  }

  /**
   * Reconcile pending orders whose approval redirect was lost — retrieve each order's Checkout Session
   * and settle (complete+paid), cancel (expired), or leave pending (still open) based on its status.
   * Only pending orders with a stored session id older than staleMs are swept (in-flight payments untouched).
   */
  async reconcilePending(now: number = Date.now(), staleMs: number = 20 * 60 * 1000): Promise<ReconcileResult> {
    const orders = await this.store.pendingOrdersOlderThan(now - staleMs);
    let checked = 0;
    let paid = 0;
    let canceled = 0;
    for (const order of orders) {
      checked++;
      try {
        const session = await this.stripe.checkout.sessions.retrieve(order.pgToken!);
        if (session.status === 'complete' && session.payment_status === 'paid') {
          const charge = order.amountCents - (order.pointsApplied ?? 0);
          if (session.amount_total !== charge) {
            console.error('[payment-stripe] reconcile amount mismatch — holding for manual review', {
              orderId: order.id,
              expected: charge,
              actual: session.amount_total,
            });
            continue;
          }
          await this.settlePaid(order);
          paid++;
        } else if (session.status === 'expired') {
          // Conditional transition (only if still pending) so we don't overwrite a competing path.
          if (await this.store.markOrderCanceled(order.id)) canceled++;
        }
        // 'open' (still awaiting payment) — leave pending and re-check next sweep.
      } catch (error) {
        console.error('[payment-stripe] reconcile lookup failed', {
          orderId: order.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return { checked, paid, canceled };
  }
}
