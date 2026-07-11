import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabase-ssr';
import { readRefCookie } from '../../../../lib/ref-cookie';
import { safeNextPath } from '../../../../lib/safe-next';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const nextParam = safeNextPath(url.searchParams.get('next'));
  if (code) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL('/login?error=auth', url.origin));
  }
  const ref = await readRefCookie();
  const dest = ref ? '/invite/confirm' : nextParam;
  return NextResponse.redirect(new URL(dest, url.origin));
}
