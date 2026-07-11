import { NextResponse } from 'next/server';
import { getPayment } from '../../../../lib/services';

/**
 * Operator-only refund trigger. No admin UI — exposed only via this secret-protected route.
 * When PAYMENTS_ADMIN_SECRET is unset (e.g. local dev), refunds are a sensitive money-reversing
 * action, so the route stays disabled rather than open.
 */
export async function POST(req: Request) {
  const secret = process.env['PAYMENTS_ADMIN_SECRET'];
  if (!secret) {
    return NextResponse.json({ error: 'PAYMENTS_ADMIN_SECRET not set — refund API disabled' }, { status: 503 });
  }
  if (req.headers.get('x-admin-secret') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let orderId: string;
  try {
    const body = await req.json();
    orderId = String(body?.orderId ?? '');
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  if (!orderId) return NextResponse.json({ error: 'orderId is required.' }, { status: 400 });

  try {
    await getPayment().refund(orderId);
    return NextResponse.json({ ok: true, orderId });
  } catch (error) {
    console.error('[api/payments/refund] refund failed', {
      orderId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Refund failed.' }, { status: 400 });
  }
}
