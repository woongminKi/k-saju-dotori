// TODO(needs-owner-creds): verify against real Polar sandbox webhook deliveries once
// POLAR_WEBHOOK_SECRET (sandbox) is provided. Signature verification is exercised offline with real HMAC
// signatures in web/lib/__tests__/payment-polar.test.ts.
import { NextResponse } from 'next/server';
import { getPayment, getStore } from '../../../../../lib/services';
import { PolarPaymentProvider } from '../../../../../lib/payment-polar';
import { verifyPolarSignature } from '../../../../../lib/polar-webhook';

// Standard Webhooks signature verification uses Node crypto, so this route must run on the Node.js runtime
// (App Router's default, declared explicitly to guard against an accidental edge switch).
export const runtime = 'nodejs';

/** Extract our internal order id from a Polar event payload's data object (order or checkout). */
async function resolveOrderId(data: Record<string, unknown>): Promise<string | undefined> {
  const metadata = data['metadata'] as Record<string, unknown> | undefined;
  const fromMetadata = metadata?.['orderId'];
  if (typeof fromMetadata === 'string' && fromMetadata) return fromMetadata;
  // Fallback: map the checkout id back to our order. `order.*` events carry checkout_id; `checkout.*` events
  // carry the checkout's own id.
  const checkoutId = (data['checkout_id'] ?? data['id']) as string | undefined;
  if (checkoutId) {
    const order = await getStore().getOrderByToken(checkoutId);
    if (order) return order.id;
  }
  return undefined;
}

export async function POST(req: Request) {
  const webhookSecret = process.env['POLAR_WEBHOOK_SECRET'];
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Polar webhook is not configured.' }, { status: 400 });
  }

  // Must verify against the exact raw bytes Polar signed — never req.json() (re-serialization breaks the
  // signature). Standard Webhooks signs `${webhook-id}.${webhook-timestamp}.${rawBody}`.
  const rawBody = await req.text();
  const ok = verifyPolarSignature(
    rawBody,
    {
      id: req.headers.get('webhook-id'),
      timestamp: req.headers.get('webhook-timestamp'),
      signature: req.headers.get('webhook-signature'),
    },
    webhookSecret,
  );
  if (!ok) {
    // A bad signature or stale/replayed timestamp is the only non-200 — Polar retries these on transient
    // issues, but a permanently-bad one just keeps 400-ing (never processed).
    console.error('[payments/polar/webhook] signature verification failed');
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  let event: { type?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    console.error('[payments/polar/webhook] malformed JSON body');
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  const type = event.type;
  const data = event.data ?? {};

  // Every handler below logs-and-swallows its own errors so a permanently-broken event never triggers
  // endless Polar retries — only a bad signature (above) returns a non-200.
  if (type === 'order.paid') {
    // Primary settlement event (equivalent to Stripe's checkout.session.completed).
    const orderId = await resolveOrderId(data).catch(() => undefined);
    if (!orderId) {
      console.error('[payments/polar/webhook] order.paid has no order reference', { data });
      return NextResponse.json({ received: true });
    }
    try {
      // Reuse the settlement path the approve route uses — idempotent, so whichever fires first wins.
      await getPayment().confirm(orderId);
    } catch (error) {
      console.error('[payments/polar/webhook] confirm failed', {
        orderId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } else if (type === 'checkout.expired') {
    const orderId = await resolveOrderId(data).catch(() => undefined);
    if (!orderId) {
      console.error('[payments/polar/webhook] checkout.expired has no order reference', { data });
      return NextResponse.json({ received: true });
    }
    try {
      // cancel() is idempotent — markOrderCanceled only transitions from pending, so a checkout already
      // confirmed (paid) or canceled is a no-op.
      await getPayment().cancel(orderId);
    } catch (error) {
      console.error('[payments/polar/webhook] cancel failed', {
        orderId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } else if (type === 'order.refunded') {
    // Dashboard-initiated refund sync. Chosen over `refund.created` because `order.refunded` is scoped to
    // the Polar order object, which carries our metadata (orderId) and checkout_id DIRECTLY — no extra hop
    // to resolve a refund -> order first (a refund.* event is scoped to a refund object).
    const orderId = await resolveOrderId(data).catch(() => undefined);
    if (!orderId) {
      console.error('[payments/polar/webhook] order.refunded has no order reference', { data });
      return NextResponse.json({ received: true });
    }
    try {
      const payment = getPayment();
      if (payment instanceof PolarPaymentProvider) {
        await payment.reclaimDashboardRefund(orderId);
      }
    } catch (error) {
      console.error('[payments/polar/webhook] dashboard refund reclaim failed', {
        orderId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json({ received: true });
}
