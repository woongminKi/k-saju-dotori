// TODO(needs-owner-creds): verify against a real Polar sandbox checkout + webhook once
// POLAR_ACCESS_TOKEN/POLAR_WEBHOOK_SECRET (sandbox) are provided. This whole adapter was written and
// tested offline against mocked `fetch` — no live Polar call has been made.
//
// Structural twin of payment-stripe.ts (Checkout-Session-style create → confirm-via-retrieve-or-webhook
// → cancel → refund → reconcile-by-polling), using raw `fetch` against Polar's REST API — NO SDK, NO new
// npm dependency. Polar is a Merchant of Record that officially supports South Korea sellers.
import 'server-only';
import { randomUUID } from 'node:crypto';
import type { Order, Store } from './store';
import {
  creditUnits, assertRefundReclaimable, reclaimRefund, DEFAULT_CURRENCY,
  type ChargeRequest, type ChargeResult, type PaymentProvider,
} from './payment';
import { findPackageFor, type ProductKind } from './pricing';
import { spendPoints, pointsBalance } from './points';

export type PolarServer = 'sandbox' | 'production';

export interface PolarOptions {
  accessToken: string;
  /** 'sandbox' (default) hits sandbox-api.polar.sh; 'production' hits api.polar.sh. */
  server: PolarServer;
  siteUrl: string;
  /**
   * Map of `${product}:${units}` (e.g. 'reading:3', 'oracle:12') -> Polar product UUID. Populated from
   * the POLAR_PRODUCT_ID_* env vars in services.ts. Polar products are fixed-price and created out of band
   * (dashboard/API — see web/tools/polar-setup.ts), so the price a checkout collects is the product's own
   * price, not an amount we pass per-checkout.
   */
  productIds: Record<string, string>;
}

export interface ReconcileResult {
  /** pending + tokened orders inspected this sweep. */
  checked: number;
  /** Orders settled (Polar checkout succeeded + paid). */
  paid: number;
  /** Orders canceled (Polar checkout expired before payment). */
  canceled: number;
}

/** Minimal shape of the Polar Checkout object fields this adapter reads (see https://polar.sh/docs). */
interface PolarCheckout {
  id: string;
  url?: string;
  status: 'open' | 'expired' | 'confirmed' | 'succeeded' | 'failed';
  amount?: number;
  currency?: string;
  /** Set once the checkout succeeds and a Polar order exists — used to target the refund API. */
  order_id?: string;
  order?: { id?: string };
  metadata?: Record<string, unknown>;
}

const PRODUCTION_BASE = 'https://api.polar.sh';
const SANDBOX_BASE = 'https://sandbox-api.polar.sh';

/**
 * Polar checkout adapter. Constructed only when Polar is configured (POLAR_ACCESS_TOKEN +
 * POLAR_WEBHOOK_SECRET both set — see services.ts). Import-safe without a token: no network at import time.
 */
export class PolarPaymentProvider implements PaymentProvider {
  private baseUrl: string;

  constructor(
    private store: Store,
    private opts: PolarOptions,
  ) {
    this.baseUrl = opts.server === 'production' ? PRODUCTION_BASE : SANDBOX_BASE;
  }

  /** Bearer-authed JSON fetch against the Polar REST API. Throws on any non-2xx (caller decides recovery). */
  private async polarFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.opts.accessToken}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Polar API ${init?.method ?? 'GET'} ${path} failed: ${res.status} ${body}`);
    }
    return res.json() as Promise<T>;
  }

  /** Resolve the Polar product UUID for a (product, units) pair. Throws if the env mapping is missing. */
  private productIdFor(product: ProductKind, units: number): string {
    const id = this.opts.productIds[`${product}:${units}`];
    if (!id) throw new Error(`No Polar product id configured for ${product}:${units} (set POLAR_PRODUCT_ID_*).`);
    return id;
  }

  async createCharge({ userId, units, pointsApplied, product = 'reading' }: ChargeRequest): Promise<ChargeResult> {
    const pkg = findPackageFor(product, units);
    const charge = pkg.amountCents - (pointsApplied ?? 0);
    if (charge < 0) throw new Error('Applied points exceed the charge amount.');

    // Polar products are fixed-price and the checkout API in scope can't discount an individual checkout,
    // so points are all-or-nothing here: full coverage (charge === 0) bypasses Polar below exactly like the
    // Stripe adapter; a PARTIAL redemption (0 < charge < price) would force Polar to collect the full product
    // price while we also spend the user's points — a silent overcharge. Reject it up front instead.
    if (charge > 0 && (pointsApplied ?? 0) > 0) {
      throw new Error('Partial points redemption is not supported by the Polar provider — use no points, or enough to cover the full amount.');
    }

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

    // Full points coverage — no money changes hands, so we never touch Polar. Settle via the same approve
    // route the paid path uses (no checkout id → confirm's zero-charge branch settles it). Mirrors Stripe.
    if (charge === 0) {
      return {
        orderId,
        pgToken: '',
        redirectUrl: `${this.opts.siteUrl}/api/checkout/approve?orderId=${orderId}`,
        amountCents: pkg.amountCents,
        currency: DEFAULT_CURRENCY,
      };
    }

    const productId = this.productIdFor(product, pkg.units);
    let checkout: PolarCheckout;
    try {
      checkout = await this.polarFetch<PolarCheckout>('/v1/checkouts/', {
        method: 'POST',
        body: JSON.stringify({
          // `products` is required — an array of product-id UUIDs (NOT a single productId field).
          products: [productId],
          // The approve route looks the order up by orderId and confirm() resolves the checkout via the
          // stored pgToken, so we do NOT depend on any {CHECKOUT_ID} success_url templating (Polar's echo of
          // the checkout id is unnecessary here — unlike Stripe's {CHECKOUT_SESSION_ID}).
          success_url: `${this.opts.siteUrl}/api/checkout/approve?orderId=${orderId}`,
          // Polar copies checkout metadata onto the resulting order — the webhook reads orderId from there.
          // (max 50 keys, keys <=40 chars, string values <=500 chars — all satisfied here.)
          metadata: { orderId, userId, product, units: String(pkg.units) },
        }),
      });
    } catch (error) {
      // Leaving the order pending would block a same-package retry via the dedup unique index — transition
      // it to failed so the user can retry immediately (mirrors payment-stripe.ts; original error wins).
      console.error('[payment-polar] checkout create failed', {
        orderId,
        error: error instanceof Error ? error.message : String(error),
      });
      await this.store.markOrderFailed(orderId).catch((cleanupError) => {
        console.error('[payment-polar] markOrderFailed cleanup failed', {
          orderId,
          error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
        });
      });
      throw error;
    }

    if (!checkout.url) {
      await this.store.markOrderFailed(orderId).catch((cleanupError) => {
        console.error('[payment-polar] markOrderFailed cleanup failed', {
          orderId,
          error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
        });
      });
      throw new Error('Polar did not return a checkout URL.');
    }

    await this.store.updateOrder(orderId, { pgToken: checkout.id });

    return {
      orderId,
      pgToken: checkout.id,
      redirectUrl: checkout.url,
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
      // Trust the checkout id we stored at createCharge over the caller-supplied one (defends against a
      // forged id in the approve callback). For a legitimate call both are identical anyway.
      const checkoutId = order.pgToken || pgToken;
      if (!checkoutId) throw new Error('No Polar checkout for this order.');
      const checkout = await this.polarFetch<PolarCheckout>(`/v1/checkouts/${checkoutId}`);
      // 'succeeded' is the definitive paid state — 'confirmed' is an intermediate (payment processing) state.
      if (checkout.status !== 'succeeded') throw new Error('Payment is not completed.');
      // Defense-in-depth: Polar collects the fixed product price, which equals amountCents (partial-points
      // redemption is rejected at createCharge, so charge === amountCents on every money path).
      if (checkout.amount !== order.amountCents) throw new Error('The charged amount does not match.');
      if (checkout.currency && checkout.currency.toLowerCase() !== order.currency) {
        throw new Error('The charged currency does not match.');
      }
    }

    await this.settlePaid(order);
    return { orderId: order.id, userId: order.userId, units: order.units };
  }

  async cancel(orderId: string): Promise<void> {
    // Existence check delegated to markOrderCanceled (missing order throws there; not-pending is a silent
    // no-op via the atomic guard). Polar exposes no documented "cancel/expire checkout" endpoint — checkouts
    // lapse on their own via `expires_at` — so, unlike the Stripe adapter, there is no best-effort PG-side
    // call to make here. markOrderCanceled is the whole cancellation.
    await this.store.markOrderCanceled(orderId);
  }

  /**
   * Resolve the Polar order id created on checkout success (the refund API targets an order, not a
   * checkout). Verified against the live sandbox (2026-07-12): the checkout GET response does NOT carry
   * an order_id/order field even when status is 'succeeded' — the order must be looked up via
   * GET /v1/orders/?checkout_id=. The checkout-field read is kept as a cheap first try in case Polar
   * adds it later.
   */
  private async resolvePolarOrderId(checkoutId: string): Promise<string> {
    const checkout = await this.polarFetch<PolarCheckout>(`/v1/checkouts/${checkoutId}`);
    const direct = checkout.order_id ?? checkout.order?.id;
    if (direct) return direct;
    const orders = await this.polarFetch<{ items?: Array<{ id: string }> }>(
      `/v1/orders/?checkout_id=${encodeURIComponent(checkoutId)}&limit=1`,
    );
    const polarOrderId = orders.items?.[0]?.id;
    if (!polarOrderId) throw new Error('No Polar order to refund for this checkout.');
    return polarOrderId;
  }

  async refund(orderId: string): Promise<void> {
    const order = await this.store.getOrder(orderId);
    if (!order) throw new Error('Order not found.');
    if (order.status !== 'paid') return; // idempotent — refunded or not-paid is a no-op

    // 1. Reclaimability check FIRST — before touching Polar. If any unit was used, throw here and leave the
    //    Polar charge intact.
    await assertRefundReclaimable(this.store, order);

    // 2. Refund at Polar. Zero-charge (points-only) orders have no Polar payment to reverse.
    const charge = order.amountCents - (order.pointsApplied ?? 0);
    if (charge > 0) {
      if (!order.pgToken) throw new Error('No Polar checkout to refund.');
      const polarOrderId = await this.resolvePolarOrderId(order.pgToken);
      await this.polarFetch('/v1/refunds', {
        method: 'POST',
        body: JSON.stringify({
          order_id: polarOrderId,
          reason: 'customer_request',
          amount: charge, // full product price (partial-points redemption is rejected at createCharge)
        }),
      });
    }

    // 3. paid -> refunded atomic transition. Only the winner reclaims (prevents double reclaim).
    const won = await this.store.markOrderRefunded(order.id);
    if (!won) return;

    // 4. Reclaim the granted units + restore spent points.
    await reclaimRefund(this.store, order);
  }

  /**
   * Sync internal state after an operator refunded directly in the Polar dashboard — the money is ALREADY
   * reversed at Polar (we did NOT call the refund API ourselves), so unlike refund() there is no Polar call
   * to guard and nothing to roll back. Driven by the `order.refunded` webhook.
   */
  async reclaimDashboardRefund(orderId: string): Promise<void> {
    const order = await this.store.getOrder(orderId);
    if (!order) throw new Error('Order not found.');
    if (order.status !== 'paid') return; // already refunded via our refund() path, or was never paid

    // If some granted units were already used we cannot claw them back — but the Polar-side refund stands
    // regardless. Log for manual handling and return: this must never throw uncaught from a webhook handler.
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

    const won = await this.store.markOrderRefunded(order.id);
    if (!won) return;
    await reclaimRefund(this.store, order);
  }

  /**
   * Reconcile pending orders whose approval redirect (and webhook) were lost — retrieve each order's Polar
   * checkout and settle (succeeded), cancel (expired), or leave pending (open/confirmed) by status. Only
   * pending orders with a stored checkout id older than staleMs are swept (in-flight payments untouched).
   */
  async reconcilePending(now: number = Date.now(), staleMs: number = 20 * 60 * 1000): Promise<ReconcileResult> {
    const orders = await this.store.pendingOrdersOlderThan(now - staleMs);
    let checked = 0;
    let paid = 0;
    let canceled = 0;
    for (const order of orders) {
      checked++;
      try {
        const checkout = await this.polarFetch<PolarCheckout>(`/v1/checkouts/${order.pgToken!}`);
        if (checkout.status === 'succeeded') {
          if (checkout.amount !== order.amountCents) {
            console.error('[payment-polar] reconcile amount mismatch — holding for manual review', {
              orderId: order.id,
              expected: order.amountCents,
              actual: checkout.amount,
            });
            continue;
          }
          await this.settlePaid(order);
          paid++;
        } else if (checkout.status === 'expired' || checkout.status === 'failed') {
          // Conditional transition (only if still pending) so we don't overwrite a competing path.
          if (await this.store.markOrderCanceled(order.id)) canceled++;
        }
        // 'open' / 'confirmed' (still awaiting/processing payment) — leave pending and re-check next sweep.
      } catch (error) {
        console.error('[payment-polar] reconcile lookup failed', {
          orderId: order.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return { checked, paid, canceled };
  }
}
