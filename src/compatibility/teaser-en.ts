// English sibling of compatibility/teaser.ts (dropped in Phase 0 — see ENGINE_SYNC.md deviation
// #3, "if a compatibility-tier free teaser is wanted in English, it needs its own -en stub").
// Free tier-teaser copy for the couple menu's free-preview path, in the approved warm, playful,
// curiosity-gap voice — term names match COMPAT_TIER_GLOSSARY (src/i18n/glossary-en.ts).
import type { CompatTier } from './types';

const TEASERS_EN: Record<CompatTier, string> = {
  '천생연분': "Okay, this one's giving soulmate energy — the kind of connection that's hard to explain and even harder to walk away from.",
  '좋음': "This one's easy in the best way — like you're rowing in the same direction without even trying.",
  '무난': 'Nothing flashy here, just solid, steady potential — the kind of match that can genuinely grow into something.',
  '노력 필요': 'This one asks for real effort from both sides — but charts like this can turn into some of the most rewarding ones.',
};

/** Free tier-teaser copy by compatibility grade (no LLM), English. */
export function tierTeaserEn(tier: CompatTier): string {
  return TEASERS_EN[tier];
}
