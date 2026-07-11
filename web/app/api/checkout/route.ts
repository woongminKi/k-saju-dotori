import { NextResponse } from 'next/server';
import { getAuth, getPayment, getStore } from '../../../lib/services';
import { findPackageFor, type ProductKind } from '../../../lib/pricing';
import { pointsBalance } from '../../../lib/points';
import { DuplicatePendingOrderError } from '../../../lib/store';
import {
  CHECKOUT_RETRY_GUARD_MS, findDuplicatePendingOrder, redirectCache, pruneRedirectCache,
  resolveDuplicatePendingOrder,
} from '../../../lib/checkout-guard';

// Simple mobile detection for payment providers that branch mobile/desktop redirect URLs.
const MOBILE_UA = /Mobi|Android|iPhone|iPad|iPod/i;

export async function POST(req: Request) {
  let units: number;
  let pointsApplied: number;
  let product: ProductKind;
  try {
    const body = await req.json();
    units = Number(body?.units);
    pointsApplied = Number(body?.pointsApplied ?? 0);
    product = body?.product === 'oracle' ? 'oracle' : 'reading';
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  if (!Number.isInteger(units) || units <= 0) {
    return NextResponse.json({ error: 'That package is invalid.' }, { status: 400 });
  }
  if (!Number.isInteger(pointsApplied) || pointsApplied < 0) {
    return NextResponse.json({ error: 'Those points are invalid.' }, { status: 400 });
  }

  const user = await getAuth().getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Please log in first.' }, { status: 401 });

  let pkg;
  try {
    pkg = findPackageFor(product, units);
  } catch {
    return NextResponse.json({ error: 'That package is invalid.' }, { status: 400 });
  }

  // Retry double-charge guard — if the same user re-requests the same package + points within a short
  // window (double-click, network retry), reuse the existing order instead of creating a new one.
  // (Best-effort guard for sequential retries — fully concurrent requests are stopped below by the
  // createCharge DuplicatePendingOrderError branch, backed by a DB unique constraint.)
  pruneRedirectCache();
  const recentPending = await getStore().pendingOrdersForUserSince(user.id, Date.now() - CHECKOUT_RETRY_GUARD_MS);
  const duplicate = findDuplicatePendingOrder(recentPending, product, pkg.units, pointsApplied);
  if (duplicate) {
    const cachedUrl = duplicate.pgToken ? redirectCache.get(duplicate.id)?.url : undefined;
    if (cachedUrl) {
      return NextResponse.json({ redirectUrl: cachedUrl });
    }
    // No token (cache miss or all-points attempt) — cancel the zombie pending order and issue a fresh one below.
    try {
      await getPayment().cancel(duplicate.id);
    } catch (error) {
      console.error('[api/checkout] failed to cancel duplicate pending order', {
        orderId: duplicate.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const balance = await pointsBalance(getStore(), user.id);
  const maxApplicable = Math.min(balance, pkg.amountCents);
  if (pointsApplied > maxApplicable) {
    return NextResponse.json({ error: 'That exceeds your available points.' }, { status: 400 });
  }

  const isMobile = MOBILE_UA.test(req.headers.get('user-agent') ?? '');

  try {
    const charge = await getPayment().createCharge({ userId: user.id, units, pointsApplied, product, isMobile });
    if (charge.pgToken) redirectCache.set(charge.orderId, { url: charge.redirectUrl, at: Date.now() });
    return NextResponse.json({ redirectUrl: charge.redirectUrl });
  } catch (error) {
    if (error instanceof DuplicatePendingOrderError) {
      // A fully concurrent request slipped past the pre-guard above — the DB partial unique index
      // stops it here. Don't create another order.
      const resolution = resolveDuplicatePendingOrder(error.existingOrder);
      if (resolution.kind === 'reuse') return NextResponse.json({ redirectUrl: resolution.redirectUrl });
      console.error('[api/checkout] duplicate order blocked by DB unique constraint (cache miss) — asking to retry', {
        orderId: error.existingOrder.id,
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'You already have a payment in progress. Try again in a moment.' },
        { status: 409 },
      );
    }
    console.error('[api/checkout] createCharge failed', {
      userId: user.id,
      product,
      units,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'We couldn’t start your payment. Try again in a moment.' }, { status: 400 });
  }
}
