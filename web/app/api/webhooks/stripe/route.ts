// TODO(needs-owner-creds): verify against a real Stripe test-mode checkout + webhook once STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET are provided
import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { getPayment } from '../../../../lib/services';

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
    console.error('[webhooks/stripe] signature verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object;
    const orderId = session.client_reference_id ?? session.metadata?.['orderId'];
    if (!orderId) {
      console.error('[webhooks/stripe] event has no order reference', { type: event.type, sessionId: session.id });
      return NextResponse.json({ received: true });
    }
    try {
      // Reuse the exact settlement path the approve route uses — idempotent, so whichever fires first wins.
      await getPayment().confirm(orderId, session.id);
    } catch (error) {
      // Log (don't throw) so Stripe doesn't endlessly retry a permanently-broken event.
      console.error('[webhooks/stripe] confirm failed', {
        orderId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json({ received: true });
}
