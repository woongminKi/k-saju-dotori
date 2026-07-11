import { NextResponse } from 'next/server';
import { getStore } from '../../../../lib/services';
import { sweepExpired } from '../../../../lib/retention';

export async function POST(req: Request) {
  // Require auth if either secret is set (RETENTION_SWEEP_SECRET manual, CRON_SECRET injected by Vercel).
  // If neither is set, allow a manual dev trigger. Vercel Cron calls with GET + Authorization: Bearer <CRON_SECRET>.
  const secret = process.env['RETENTION_SWEEP_SECRET'];
  const cronSecret = process.env['CRON_SECRET'];
  const headerOk = Boolean(secret) && req.headers.get('x-sweep-secret') === secret;
  const cronAuth = Boolean(cronSecret) && req.headers.get('authorization') === `Bearer ${cronSecret}`;
  const guardActive = Boolean(secret) || Boolean(cronSecret);
  if (guardActive && !headerOk && !cronAuth) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const res = await sweepExpired(getStore());
  return NextResponse.json(res);
}

export async function GET(req: Request) {
  // Vercel Cron calls with GET. Reuse the same guard.
  return POST(req);
}
