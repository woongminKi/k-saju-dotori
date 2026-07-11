// English sibling of character.ts (which stays untouched — see ENGINE_SYNC.md: verbatim files are
// never edited, new behavior goes in new files). Day-stem -> share-card character archetype, in the
// approved warm best-friend Dotori voice (see reading/prompts/frame-en-v1.ts TONE_BLOCK).
// Deterministic constant — copy changes don't rewrite already-issued cards (snapshots are immutable).
import { STEM_GLOSSARY } from '../i18n/glossary-en';
import type { FullSajuChart } from '../saju-engine';

export interface SajuCharacterEn {
  name: string;
  line: string;
}

/** Five-element counts re-keyed to English names — the hanja ElementCount keys stay in the engine
 *  layer so the web layer never touches CJK identifiers. */
export type CardElementsEn = Record<'Wood' | 'Fire' | 'Earth' | 'Metal' | 'Water', number>;

export function elementCountToEn(elements: FullSajuChart['elements']): CardElementsEn {
  return {
    Wood: elements.木,
    Fire: elements.火,
    Earth: elements.土,
    Metal: elements.金,
    Water: elements.水,
  };
}

const CHARACTERS_EN: Record<string, SajuCharacterEn> = {
  甲: { name: 'The Steady Oak', line: "The friend who's still standing after the storm everyone else got blown over by." },
  乙: { name: 'The Wildflower', line: "Drop you anywhere and you'll find a way to bloom — bending is your superpower, not a weakness." },
  丙: { name: 'The Sunbeam', line: 'You walk into a room and somehow the whole mood lifts — you just have that effect on people.' },
  丁: { name: 'The Candle', line: "Not the loudest flame in the room, but the one that's still warm long after the party ends." },
  戊: { name: 'The Mountain', line: 'The one everyone leans on when things wobble, and somehow you never tip over.' },
  己: { name: 'The Open Field', line: "You've got a gift for helping things grow — people leave a little more themselves around you." },
  庚: { name: 'The Bedrock', line: "Once you've made up your mind, betting against you is a genuinely bad idea." },
  辛: { name: 'The Gemstone', line: 'You catch the tiny details everyone else misses, and yeah, you sparkle a little too.' },
  壬: { name: 'The Deep Sea', line: "Calm on the surface, but there's a whole lot going on underneath once people get to know you." },
  癸: { name: 'The Quiet Rain', line: "You don't make a big entrance — you just quietly soak in until people can't imagine life without you." },
};

const FALLBACK_EN: SajuCharacterEn = {
  name: 'The Mystery Acorn',
  line: 'A bit of a puzzle at first, but the kind that gets more charming the longer people stick around.',
};

export function characterForDayStemEn(stem: string): SajuCharacterEn {
  return CHARACTERS_EN[stem] ?? FALLBACK_EN;
}

/** Card day-master label, e.g. "Yang Wood day master". Unknown stems -> "Unknown day master". */
export function stemCardLabelEn(stem: string): string {
  const entry = STEM_GLOSSARY[stem];
  return entry ? `${entry.en} day master` : 'Unknown day master';
}
