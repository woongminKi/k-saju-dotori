'use server';
import { createHash, randomBytes } from 'node:crypto';
import { getStore } from '../../lib/services';
import type { ShareCard } from '../../lib/store';
import { decodeBirth } from '../../lib/birth-params';
import { buildChart } from '../../lib/engine';
import { compatScoreForEntry } from '../../lib/rooms';
import { buildSoloPayload, buildCompatPayload, type ShareCardPayload } from '../../lib/share-cards';

export type ShareCardInput =
  | { kind: 'solo'; query: string }
  | { kind: 'compat'; roomId: string; entryId: string };

export type ShareCardActionResult = { ok: true; url: string } | { ok: false; error: string };

const CARD_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function shortId(): string {
  return randomBytes(8).toString('hex').slice(0, 8);
}

/**
 * Recomputes the render payload from the input's identifiers only — never from client-supplied
 * display values — so a caller can't forge a card showing a score/character it didn't earn.
 */
async function buildPayload(input: ShareCardInput): Promise<ShareCardPayload> {
  if (input.kind === 'solo') {
    const fields = decodeBirth(new URLSearchParams(input.query));
    return buildSoloPayload(buildChart(fields));
  }
  const store = getStore();
  const room = await store.getRoom(input.roomId);
  if (!room) throw new Error('This room has expired or does not exist.');
  const entry = (await store.roomEntries(input.roomId)).find((e) => e.id === input.entryId);
  if (!entry) throw new Error('We couldn’t find that compatibility result.');
  const score = compatScoreForEntry(room, entry);
  return buildCompatPayload(score, room.hostName ?? null, entry.nickname);
}

/** Card creation allows anonymous callers (viral loop). The payload holds no PII. */
export async function createShareCardAction(input: ShareCardInput): Promise<ShareCardActionResult> {
  try {
    const store = getStore();
    const now = Date.now();
    const payloadJson = JSON.stringify(await buildPayload(input));
    const card: ShareCard = {
      id: shortId(),
      kind: input.kind,
      payloadJson,
      payloadHash: createHash('sha256').update(payloadJson).digest('hex'),
      createdAt: now,
      expiresAt: now + CARD_TTL_MS,
    };
    if (input.kind === 'compat') card.roomId = input.roomId;
    await store.createShareCard(card);
    const base = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000';
    return { ok: true, url: `${base}/s/${card.id}` };
  } catch {
    return { ok: false, error: 'We couldn’t make that card. Try again in a moment.' };
  }
}
