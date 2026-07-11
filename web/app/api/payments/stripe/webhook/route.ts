// TODO(needs-owner-creds): verify against a real Stripe test-mode checkout + webhook once STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET are provided
import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { getPayment } from '../../../../../lib/services';
import { StripePaymentProvider } from '../../../../../lib/payment-stripe';

// Stripe webhook signature verification uses Node crypto, so this route must run on the Node.js
// runtime (App Router's default, declared explicitly to guard against an accidental edge switch).
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];
  const secretKey = process.env['STRIPE_SECRET_KEY'];
  const signature = req.headers.get('stripe-signature');
  if (!webhookSecret || !secretKey || !signature) {
    return NextResponse.json({ error: 'Stripe webhook is not configured.' }, { status: 400 });
  }

  // Must verify against the exact raw bytes Stripe signed — never req.json() (re-serialization breaks the signature).
  const rawBody = await req.text();
  const stripe = new Stripe(secretKey);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    // A bad signature is a 400 per Stripe's docs — Stripe only retries these on transient issues.
    console.error('[payments/stripe/webhook] signature verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object;
    const orderId = session.client_reference_id ?? session.metadata?.['orderId'];
    if (!orderId) {
      console.error('[payments/stripe/webhook] event has no order reference', { type: event.type, sessionId: session.id });
      return NextResponse.json({ received: true });
    }
    try {
      // Reuse the exact settlement path the approve route uses — idempotent, so whichever fires first wins.
      await getPayment().confirm(orderId, session.id);
    } catch (error) {
      // Log (don't throw) so Stripe doesn't endlessly retry a permanently-broken event.
      console.error('[payments/stripe/webhook] confirm failed', {
        orderId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } else if (event.type === 'checkout.session.expired') {
    const session = event.data.object;
    const orderId = session.client_reference_id ?? session.metadata?.['orderId'];
    if (!orderId) {
      console.error('[payments/stripe/webhook] expired event has no order reference', { type: event.type, sessionId: session.id });
      return NextResponse.json({ received: true });
    }
    try {
      // cancel() is safe/idempotent — markOrderCanceled only transitions from pending, so a session
      // already confirmed (paid) or canceled is a no-op.
      await getPayment().cancel(orderId);
    } catch (error) {
      console.error('[payments/stripe/webhook] cancel failed', {
        orderId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } else if (event.type === 'charge.refunded') {
    // Operator refunded a charge directly in the Dashboard. The Order has no stored payment_intent, so
    // map it back to our order id live: payment_intent -> its Checkout Session -> client_reference_id.
    const charge = event.data.object;
    const pi = charge.payment_intent;
    const paymentIntentId = typeof pi === 'string' ? pi : pi?.id;
    try {
      if (!paymentIntentId) {
        console.error('[payments/stripe/webhook] refunded charge has no payment intent', { chargeId: charge.id });
        return NextResponse.json({ received: true });
      }
      const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 });
      const session = sessions.data[0];
      const orderId = session?.client_reference_id ?? session?.metadata?.['orderId'];
      if (!orderId) {
        // A refund on a charge unrelated to one of our Checkout Sessions — nothing to reconcile.
        console.error('[payments/stripe/webhook] no order for refunded charge', { chargeId: charge.id, paymentIntentId });
        return NextResponse.json({ received: true });
      }
      const payment = getPayment();
      if (payment instanceof StripePaymentProvider) {
        await payment.reclaimDashboardRefund(orderId);
      }
    } catch (error) {
      console.error('[payments/stripe/webhook] dashboard refund reclaim failed', {
        paymentIntentId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json({ received: true });
}
