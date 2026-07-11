import { NextResponse } from 'next/server';
import { getPayment } from '../../../../lib/services';
import { StubPaymentProvider } from '../../../../lib/payment';
import { StripePaymentProvider } from '../../../../lib/payment-stripe';

/**
 * Pending-order reconciliation cron. With Stripe configured this confirms payments whose approval
 * callback (and webhook) were lost by re-checking each Checkout Session. Under the stub provider,
 * approval is instant and synchronous, so there's nothing to reconcile. Same secret-guard pattern
 * as retention/sweep.
 */
export async function POST(req: Request) {
  const secret = process.env['PAYMENTS_RECONCILE_SECRET'];
  const cronSecret = process.env['CRON_SECRET'];
  const headerOk = Boolean(secret) && req.headers.get('x-reconcile-secret') === secret;
  const cronAuth = Boolean(cronSecret) && req.headers.get('authorization') === `Bearer ${cronSecret}`;
  const guardActive = Boolean(secret) || Boolean(cronSecret);
  if (guardActive && !headerOk && !cronAuth) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const payment = getPayment();
  if (payment instanceof StripePaymentProvider) {
    const result = await payment.reconcilePending();
    return NextResponse.json(result);
  }
  if (payment instanceof StubPaymentProvider) {
    return NextResponse.json({ skipped: true, reason: 'stub payment mode — no reconciliation needed' });
  }
  return NextResponse.json({ skipped: true, reason: 'no reconciler available' });
}

export async function GET(req: Request) {
  // Vercel Cron calls with GET. Reuse the same guard.
  return POST(req);
}
