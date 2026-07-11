'use server';
import { createHash, randomBytes } from 'node:crypto';
import { getStore } from '../../lib/services';
import type { ShareCard } from '../../lib/store';

export type ShareCardInput =
  | { kind: 'solo'; query: string }
  | { kind: 'compat'; roomId: string; entryId: string };

export type ShareCardActionResult = { ok: true; url: string } | { ok: false; error: string };

const CARD_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Phase-6 scope reduction: the tier/character-specific payload (English character names, compat
// teaser copy) doesn't exist in the engine yet, so we persist a minimal honest snapshot — just the
// card kind. The public /s/[id] page renders a generic "get your own reading" card from it.
function shortId(): string {
  return randomBytes(8).toString('hex').slice(0, 8);
}

/** Card creation allows anonymous callers (viral loop). The payload holds no PII. */
export async function createShareCardAction(input: ShareCardInput): Promise<ShareCardActionResult> {
  try {
    const store = getStore();
    const now = Date.now();
    const payload = { kind: input.kind } as const;
    const payloadJson = JSON.stringify(payload);
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
