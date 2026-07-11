'use server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { track } from '@vercel/analytics/server';
import type { CompatScore } from '@engine/compatibility';
import { getAuth, getStore } from '../../../../lib/services';
import { supabaseServer } from '../../../../lib/supabase-ssr';
import { readBirthFromFormData } from '../../../../lib/birth-params';
import { createRoomForHost, submitEntry } from '../../../../lib/rooms';
import { enforceRateLimit, userKey, ipKey, RATE_LIMIT_MESSAGE } from '../../../../lib/rate-limit';

// Pull the signed-in user's Google display name for the host label. Absent -> undefined (UI fallback).
// In a Supabase-unconfigured (stub) environment supabaseServer() throws -> absorbed as undefined.
async function currentDisplayName(): Promise<string | undefined> {
  try {
    const sb = await supabaseServer();
    const { data } = await sb.auth.getUser();
    const meta = data.user?.user_metadata as Record<string, unknown> | undefined;
    if (!meta) return undefined;
    const pick = (k: string): string | undefined =>
      typeof meta[k] === 'string' && meta[k] !== '' ? (meta[k] as string) : undefined;
    return pick('name') ?? pick('full_name') ?? pick('user_name');
  } catch {
    return undefined;
  }
}

// Used directly as <form action={...}> on the new-room page -> the only arg is formData.
export async function createCompatRoomAction(formData: FormData): Promise<void> {
  const user = await getAuth().getCurrentUser();
  if (!user) redirect('/');
  // Form action can't return an HTTP 429, so on a rate-limit block bounce back to the form with a
  // flag the page renders as an in-voice notice.
  if (!(await enforceRateLimit('compatRoomCreate', userKey(user.id))).allowed) {
    redirect('/menu/compat/room/new?rl=1');
  }
  const birth = readBirthFromFormData(formData); // missing fields are pre-blocked by the page's required attrs
  const hostName = await currentDisplayName();
  const room = await createRoomForHost(getStore(), user.id, birth, undefined, hostName);
  await track('room_create').catch(() => {});
  redirect(`/menu/compat/room/${room.id}`);
}

export type SubmitEntryState =
  | { score: CompatScore; entryId: string }
  | { error: string }
  | null;

export async function submitRoomEntryAction(
  roomId: string, _prev: SubmitEntryState, formData: FormData,
): Promise<SubmitEntryState> {
  const nickname = String(formData.get('nickname') ?? '');
  // Guest flow (no login) — rate-limit by hashed IP.
  const forwardedFor = (await headers()).get('x-forwarded-for');
  if (!(await enforceRateLimit('compatRoomJoin', ipKey(forwardedFor))).allowed) {
    return { error: RATE_LIMIT_MESSAGE };
  }
  let birth;
  try {
    birth = readBirthFromFormData(formData);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Invalid input' };
  }
  try {
    const { score, entryId } = await submitEntry(getStore(), roomId, nickname, birth);
    await track('room_join', { score: score.score }).catch(() => {});
    return { score, entryId };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Submission failed' };
  }
}
