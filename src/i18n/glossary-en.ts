// English glossary for Korean Saju/BaZi terminology — maps every Korean label the engine can
// produce (stems, branches, elements, ten gods, twelve stages, sinsal) to an English term + a
// short one-line gloss. Consumed by chart-summary-en.ts so engine output is English-first.
//
// Completeness is enforced by glossary-en.test.ts, which cross-checks every key against the
// literal union types in saju-engine/types.ts (TenGod, TwelveState, SinsalCode) and the
// STEMS/BRANCHES tables in saju-engine/daewoon.ts — if the engine ever adds a new stem, branch,
// ten god, stage, or sinsal, that test fails until this file is updated.

export interface GlossaryEntry {
  en: string;
  gloss: string;
}

// ── Five Elements (오행) ──────────────────────────────────────────────────────────────────────
export const ELEMENT_GLOSSARY: Record<string, GlossaryEntry> = {
  '木': { en: 'Wood', gloss: 'growth, flexibility, upward drive' },
  '火': { en: 'Fire', gloss: 'expression, passion, visibility' },
  '土': { en: 'Earth', gloss: 'stability, trust, groundedness' },
  '金': { en: 'Metal', gloss: 'discipline, precision, resolve' },
  '水': { en: 'Water', gloss: 'wisdom, adaptability, depth' },
};

// ── Ten Heavenly Stems (천간) — element + polarity ───────────────────────────────────────────
export const STEM_GLOSSARY: Record<string, GlossaryEntry> = {
  '甲': { en: 'Yang Wood', gloss: 'a tall tree — upright, ambitious, hard to bend' },
  '乙': { en: 'Yin Wood', gloss: 'a vine or flower — flexible, adaptive, resilient' },
  '丙': { en: 'Yang Fire', gloss: 'the sun — radiant, expressive, hard to ignore' },
  '丁': { en: 'Yin Fire', gloss: 'a candle or hearth — warm, focused, steady' },
  '戊': { en: 'Yang Earth', gloss: 'a mountain — solid, dependable, unmovable' },
  '己': { en: 'Yin Earth', gloss: 'a field — nurturing, receptive, fertile' },
  '庚': { en: 'Yang Metal', gloss: 'raw ore or a blade — decisive, tough, direct' },
  '辛': { en: 'Yin Metal', gloss: 'a jewel — refined, precise, sensitive' },
  '壬': { en: 'Yang Water', gloss: 'the ocean — expansive, deep, unpredictable' },
  '癸': { en: 'Yin Water', gloss: 'mist or dew — subtle, quiet, seeping in' },
};

// ── Twelve Earthly Branches (지지) — zodiac animal ───────────────────────────────────────────
export const BRANCH_GLOSSARY: Record<string, GlossaryEntry> = {
  '子': { en: 'Rat', gloss: 'quick-witted, resourceful' },
  '丑': { en: 'Ox', gloss: 'steady, patient, hardworking' },
  '寅': { en: 'Tiger', gloss: 'bold, independent, restless' },
  '卯': { en: 'Rabbit', gloss: 'gentle, cautious, diplomatic' },
  '辰': { en: 'Dragon', gloss: 'ambitious, charismatic, larger than life' },
  '巳': { en: 'Snake', gloss: 'perceptive, private, strategic' },
  '午': { en: 'Horse', gloss: 'energetic, sociable, freedom-loving' },
  '未': { en: 'Goat', gloss: 'gentle, artistic, empathetic' },
  '申': { en: 'Monkey', gloss: 'clever, versatile, playful' },
  '酉': { en: 'Rooster', gloss: 'meticulous, confident, direct' },
  '戌': { en: 'Dog', gloss: 'loyal, honest, protective' },
  '亥': { en: 'Pig', gloss: 'generous, easygoing, sincere' },
};

// ── Ten Gods (십신) — relationship of another stem to the Day Master ────────────────────────
export const TEN_GOD_GLOSSARY: Record<string, GlossaryEntry> = {
  '비견': { en: 'Companion', gloss: 'peer-like relationships, equal footing' },
  '겁재': { en: 'Rob Wealth', gloss: 'competitive drive, shared resources, rivalry' },
  '식신': { en: 'Eating God', gloss: 'self-expression, ease, enjoying the fruits of effort' },
  '상관': { en: 'Hurting Officer', gloss: 'sharp talent, bluntness, pushing against rules' },
  '편재': { en: 'Indirect Wealth', gloss: 'opportunistic gain, flexible money, risk-taking' },
  '정재': { en: 'Direct Wealth', gloss: 'steady income, careful management, earned reward' },
  '편관': { en: 'Seven Killings', gloss: 'pressure, discipline from outside, high stakes' },
  '정관': { en: 'Direct Officer', gloss: 'structure, duty, playing by the rules' },
  '편인': { en: 'Indirect Resource', gloss: 'unconventional insight, private study, intuition' },
  '정인': { en: 'Direct Resource', gloss: 'formal support, mentorship, credentialed learning' },
};

// ── Twelve Life Stages (12운성) — day-master strength across the branches ───────────────────
export const TWELVE_STATE_GLOSSARY: Record<string, GlossaryEntry> = {
  '장생': { en: 'Growth', gloss: 'a fresh start, new energy taking root' },
  '목욕': { en: 'Bath', gloss: 'vulnerability, exposure, a rite of passage' },
  '관대': { en: 'Youth', gloss: 'coming of age, gaining confidence and capability' },
  '건록': { en: 'Prime', gloss: 'independence, self-reliance, career strength' },
  '제왕': { en: 'Peak', gloss: 'maximum strength, leadership, the height of power' },
  '쇠': { en: 'Decline', gloss: 'easing off, experience over exertion' },
  '병': { en: 'Sickness', gloss: 'strain, fatigue, needing care' },
  '사': { en: 'Death', gloss: 'an ending, stillness, letting go' },
  '묘': { en: 'Storage', gloss: 'dormancy, holding potential in reserve' },
  '절': { en: 'Extinction', gloss: 'a total reset, the quietest point of the cycle' },
  '태': { en: 'Conception', gloss: 'a seed idea, potential not yet visible' },
  '양': { en: 'Nurture', gloss: 'quiet growth, being cared for before emerging' },
};

// ── Sinsal (신살) — notable special stars ────────────────────────────────────────────────────
export const SINSAL_GLOSSARY: Record<string, GlossaryEntry> = {
  '도화': { en: 'Peach Blossom', gloss: 'charm and magnetism that draws people in' },
  '역마': { en: 'Traveling Horse', gloss: 'restlessness, relocation, a life in motion' },
  '화개': { en: 'Canopy', gloss: 'artistic depth, solitude, spiritual inclination' },
  '홍염': { en: 'Red Glow', gloss: 'romantic magnetism, a flair for passion' },
  '천을귀인': { en: 'Heavenly Noble', gloss: 'a benefactor star — help arrives when needed' },
};

// ── Polarity (음양) ───────────────────────────────────────────────────────────────────────────
export const POLARITY_GLOSSARY: Record<string, GlossaryEntry> = {
  '양': { en: 'Yang', gloss: 'active, outward, assertive' },
  '음': { en: 'Yin', gloss: 'receptive, inward, subtle' },
};

export type GlossaryCategory =
  | 'element' | 'stem' | 'branch' | 'tenGod' | 'twelveState' | 'sinsal' | 'polarity';

const CATEGORY_GLOSSARY: Record<GlossaryCategory, Record<string, GlossaryEntry>> = {
  element: ELEMENT_GLOSSARY,
  stem: STEM_GLOSSARY,
  branch: BRANCH_GLOSSARY,
  tenGod: TEN_GOD_GLOSSARY,
  twelveState: TWELVE_STATE_GLOSSARY,
  sinsal: SINSAL_GLOSSARY,
  polarity: POLARITY_GLOSSARY,
};

/**
 * Looks up a Korean label *within a given category*. Category-scoped rather than a single flat
 * map on purpose: the domain reuses the label '양' for two unrelated things — the Yang polarity
 * and the twelfth Twelve-Stage name ("Nurture") — so a flat merge would silently pick whichever
 * category was spread last and return the wrong gloss for the other. Always call with the
 * category the label actually came from (e.g. `glossOf('twelveState', chart.twelveStates.year)`).
 * Throws if missing — callers should never silently leak untranslated Korean text.
 */
export function glossOf(category: GlossaryCategory, koreanLabel: string): GlossaryEntry {
  const entry = CATEGORY_GLOSSARY[category][koreanLabel];
  if (!entry) throw new Error(`glossary-en: no English entry for "${koreanLabel}" in category "${category}"`);
  return entry;
}

/**
 * Flat lookup across element/stem/branch/tenGod/sinsal only (categories that use disjoint hanja
 * or hangul labels with no cross-category collisions). Polarity and twelveState are deliberately
 * excluded — '양' collides between them; use `glossOf('twelveState' | 'polarity', ...)` for those.
 */
export const GLOSSARY_EN: Record<string, GlossaryEntry> = {
  ...ELEMENT_GLOSSARY,
  ...STEM_GLOSSARY,
  ...BRANCH_GLOSSARY,
  ...TEN_GOD_GLOSSARY,
  ...SINSAL_GLOSSARY,
};
