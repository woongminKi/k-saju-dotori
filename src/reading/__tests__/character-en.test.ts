import { describe, it, expect } from 'vitest';
import { characterForDayStemEn, stemCardLabelEn } from '../character-en';
import { hasCjkLeak } from '../sanitize-en';

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

describe('characterForDayStemEn', () => {
  it('all 10 day stems — non-empty, distinct, CJK-free name/line', () => {
    const names = STEMS.map((s) => characterForDayStemEn(s).name);
    for (const s of STEMS) {
      const c = characterForDayStemEn(s);
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.line.length).toBeGreaterThan(0);
      expect(hasCjkLeak(c.name)).toBe(false);
      expect(hasCjkLeak(c.line)).toBe(false);
    }
    expect(new Set(names).size).toBe(10);
  });

  it('unknown stem -> fallback (non-empty, CJK-free)', () => {
    const c = characterForDayStemEn('?');
    expect(c.name).toBe('The Mystery Acorn');
    expect(c.line.length).toBeGreaterThan(0);
    expect(hasCjkLeak(c.name)).toBe(false);
    expect(hasCjkLeak(c.line)).toBe(false);
  });
});

describe('stemCardLabelEn', () => {
  it('builds an English day-master label from the stem glossary', () => {
    expect(stemCardLabelEn('甲')).toContain('Yang Wood');
    expect(stemCardLabelEn('癸')).toContain('Yin Water');
  });

  it('does not throw and stays CJK-free for all 10 stems', () => {
    for (const s of STEMS) {
      const label = stemCardLabelEn(s);
      expect(label.length).toBeGreaterThan(0);
      expect(hasCjkLeak(label)).toBe(false);
    }
  });

  it('unknown stem -> "Unknown day master"', () => {
    expect(stemCardLabelEn('?')).toBe('Unknown day master');
  });
});
