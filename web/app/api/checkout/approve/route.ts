import { NextResponse } from 'next/server';
import { getAuth, getPayment, getStore } from '../../../../lib/services';
import { redirectCache } from '../../../../lib/checkout-guard';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get('orderId');
  const pgToken = url.searchParams.get('pg_token');
  if (!orderId) return NextResponse.redirect(new URL('/checkout/fail', req.url));

  const user = await getAuth().getCurrentUser();
  if (!user) return NextResponse.redirect(new URL('/login', req.url));

  const order = await getStore().getOrder(orderId);
  if (!order || order.userId !== user.id) {
    return NextResponse.redirect(new URL('/checkout/fail', req.url));
  }

  // Once the approval callback arrives, this order's cached redirect must not be re-served by the
  // retry guard (success or fail — pg tokens are usually single-use, so reuse is pointless/unsafe).
  redirectCache.delete(orderId);

  try {
    const { units } = await getPayment().confirm(orderId, pgToken ?? undefined);
    const product = order.product ?? 'reading';
    return NextResponse.redirect(new URL(`/checkout/success?units=${units}&product=${product}`, req.url));
  } catch (error) {
    console.error('[checkout/approve] confirm failed', {
      orderId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.redirect(new URL('/checkout/fail', req.url));
  }
}
