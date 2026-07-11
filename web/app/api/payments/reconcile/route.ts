import { NextResponse } from 'next/server';
import { getPayment } from '../../../../lib/services';
import { StubPaymentProvider } from '../../../../lib/payment';

/**
 * Pending-order reconciliation cron. With a real PG (Phase 5, Stripe) this would confirm payments
 * whose approval callback was lost. Under the stub provider, approval is instant and synchronous,
 * so there's nothing to reconcile — this is a near-no-op until Stripe lands. Same secret-guard
 * pattern as retention/sweep.
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
  if (payment instanceof StubPaymentProvider) {
    return NextResponse.json({ skipped: true, reason: 'stub payment mode — no reconciliation needed' });
  }
  // TODO(P5): call the real provider's reconcile method once Stripe is wired.
  return NextResponse.json({ skipped: true, reason: 'no reconciler available' });
}

export async function GET(req: Request) {
  // Vercel Cron calls with GET. Reuse the same guard.
  return POST(req);
}
