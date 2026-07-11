import { NextResponse } from 'next/server';
import { getAuth, getStore } from '../../../lib/services';
import { claimReferral } from '../../../lib/referral';
import { isValidReferralCode } from '../../../lib/referral-code';
import { clearRefCookie } from '../../../lib/ref-cookie';

export async function POST(req: Request) {
  let code: string;
  try {
    const body = await req.json();
    code = String(body?.code ?? '').trim().toUpperCase();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  if (!isValidReferralCode(code)) {
    return NextResponse.json({ error: 'That code format isn’t right.' }, { status: 400 });
  }

  const user = await getAuth().getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Please log in first.' }, { status: 401 });

  const result = await claimReferral(getStore(), user.id, code);
  if (!result.ok) {
    const msg =
      result.reason === 'invalid_code' ? 'That code doesn’t exist.' :
      result.reason === 'self' ? 'You can’t use your own code.' :
      'You already have a referrer.';
    return NextResponse.json({ error: msg, reason: result.reason }, { status: 400 });
  }
  await clearRefCookie();
  return NextResponse.json({ ok: true });
}
