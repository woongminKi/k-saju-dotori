import { describe, it, expect } from 'vitest';
import { tierTeaserEn } from '../teaser-en';
import { hasCjkLeak } from '../../reading/sanitize-en';
import type { CompatTier } from '../types';

const ALL_TIERS: CompatTier[] = ['천생연분', '좋음', '무난', '노력 필요'];

describe('compatibility/teaser-en', () => {
  it('has a non-empty English teaser for every compatibility tier', () => {
    for (const tier of ALL_TIERS) {
      const t = tierTeaserEn(tier);
      expect(t.length).toBeGreaterThan(0);
      expect(hasCjkLeak(t)).toBe(false);
    }
  });

  it('every tier has distinct copy (no accidental duplicates)', () => {
    const texts = ALL_TIERS.map((t) => tierTeaserEn(t));
    expect(new Set(texts).size).toBe(ALL_TIERS.length);
  });
});
