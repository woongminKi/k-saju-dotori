import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { isValidReferralCode } from './lib/referral-code';

const REF_COOKIE = 'dotori_ref'; // keep in sync with lib/ref-cookie.ts

function applyRefCookie(req: NextRequest, res: NextResponse) {
  const ref = req.nextUrl.searchParams.get('ref');
  if (ref && isValidReferralCode(ref)) {
    res.cookies.set(REF_COOKIE, ref, {
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }
}

export async function middleware(req: NextRequest) {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const anon = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

  if (!url || !anon) {
    const res = NextResponse.next();
    applyRefCookie(req, res);
    return res;
  }

  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (toSet: { name: string; value: string; options: CookieOptions }[]) => {
        for (const { name, value } of toSet) {
          req.cookies.set(name, value);
        }
        res = NextResponse.next({ request: req });
        for (const { name, value, options } of toSet) {
          res.cookies.set(name, value, options);
        }
      },
    },
  });
  await supabase.auth.getUser();

  applyRefCookie(req, res);
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)'],
};
