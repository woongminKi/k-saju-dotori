import type { FullSajuChart } from '@engine/saju-engine';
import type { CompatScore } from '@engine/compatibility';
import { tierTeaserEn } from '@engine/compatibility';
import { characterForDayStemEn, stemCardLabelEn, elementCountToEn } from '@engine/reading/character-en';
import { TIER_LABEL } from '../components/CompatScoreCard';

// Render snapshots for the public /s/[id] share card + its dynamic OG image. Pure data + pure
// helpers only (no store, no server-only) so both the server action and the OG route can build
// and truncate without pulling in rendering. Payloads hold no PII.

export type ElementName = 'Wood' | 'Fire' | 'Earth' | 'Metal' | 'Water';

export interface SoloCardPayload {
  kind: 'solo';
  characterName: string;
  stemLabel: string;
  elements: Record<ElementName, number>;
  line: string;
}

export interface CompatCardPayload {
  kind: 'compat';
  score: number;
  tier: string;
  line: string;
  hostName: string | null;
  guestNickname: string;
}

export type ShareCardPayload = SoloCardPayload | CompatCardPayload;

/** Fixed iteration order for the five-element bars — JSON round-trips don't guarantee key order. */
export const ELEMENT_ORDER: readonly ElementName[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];

/**
 * Builds a solo payload straight from a recomputed chart — never from client-supplied values.
 * All English copy comes from the engine's -en helpers/glossary (no CJK leaks into the web layer).
 */
export function buildSoloPayload(chart: FullSajuChart): SoloCardPayload {
  const ch = characterForDayStemEn(chart.dayStem);
  return {
    kind: 'solo',
    characterName: ch.name,
    stemLabel: stemCardLabelEn(chart.dayStem),
    elements: elementCountToEn(chart.elements),
    line: ch.line,
  };
}

/**
 * Builds a compat payload from a recomputed score. `tier` reuses CompatScoreCard's TIER_LABEL and
 * `line` reuses the engine's tierTeaserEn — no new tier copy is invented here.
 */
export function buildCompatPayload(
  score: CompatScore,
  hostName: string | null,
  guestNickname: string,
): CompatCardPayload {
  return {
    kind: 'compat',
    score: score.score,
    tier: TIER_LABEL[score.tier],
    line: tierTeaserEn(score.tier),
    hostName,
    guestNickname,
  };
}

const ELLIPSIS = '…';

/**
 * Truncates to at most `maxChars`, breaking on a word boundary where one is reasonably close,
 * and appends a single-character ellipsis when it cuts. Pure/sync — English share-card lines run
 * longer than the Korean originals, so the OG image applies this before rendering the line.
 */
export function truncateForCard(text: string, maxChars: number): string {
  if (maxChars <= 0) return '';
  if (text.length <= maxChars) return text;
  // Reserve one slot for the ellipsis so the result is never longer than maxChars.
  const budget = maxChars - 1;
  const head = text.slice(0, budget);
  const lastSpace = head.lastIndexOf(' ');
  // Trim back to the last word boundary only if it isn't so early it strips most of the text.
  const cut = lastSpace >= budget * 0.6 ? head.slice(0, lastSpace) : head;
  return `${cut.trimEnd()}${ELLIPSIS}`;
}
