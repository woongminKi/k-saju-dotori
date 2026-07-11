// English sibling of menus/teaser.ts. teaser.ts was kept verbatim in Phase 0 (an addition needed
// by the copied runners — see ENGINE_SYNC.md), but its no-ok-section fallback string
// ('풀이를 준비 중임. 잠시 후 다시 시도해줘.') is Korean and CAN reach an English user if every
// section fails to generate (e.g. an LLM outage exhausts every retry) — the Phase 2 eval passed
// 0 CJK leaks only because none of its 50 calls happened to hit that branch, not because the
// branch is unreachable. solo/couple/love-marriage/career all import from here instead of
// teaser.ts.
import type { MenuSection } from './types';

const TEASER_MAX = 120;

/** First 120 chars of the first ok section's body as a free preview. English fallback if no
 *  section succeeded. Deterministic (no LLM). */
export function buildTeaserEn(sections: MenuSection[]): string {
  const first = sections.find((s) => s.ok && s.body);
  if (!first) return 'Your reading is still coming together — try again in a moment.';
  if (first.body.length <= TEASER_MAX) return first.body;
  return `${first.body.slice(0, TEASER_MAX)}...`;
}
