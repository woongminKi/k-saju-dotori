import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabase-ssr';

export async function POST(req: Request) {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  return NextResponse.redirect(new URL('/', new URL(req.url).origin), { status: 303 });
}
