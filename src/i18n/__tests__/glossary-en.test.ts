// glossary-en completeness — if the engine ever adds a new stem/branch/ten-god/stage/sinsal,
// this test fails until glossary-en.ts is updated, so English output can never silently leak an
// untranslated Korean label.
import { describe, it, expect } from 'vitest';
import type { TenGod, TwelveState, SinsalCode } from '../../saju-engine';
import type { Element } from '../../chart-input/types';
import { tenGodOf } from '../../saju-engine/ten-gods';
import { twelveStateOf } from '../../saju-engine/twelve-states';
import { stemElement, branchElement, HIDDEN_STEMS } from '../../chart-input/_element-tables';
import {
  ELEMENT_GLOSSARY,
  STEM_GLOSSARY,
  BRANCH_GLOSSARY,
  TEN_GOD_GLOSSARY,
  TWELVE_STATE_GLOSSARY,
  SINSAL_GLOSSARY,
  POLARITY_GLOSSARY,
  GLOSSARY_EN,
  glossOf,
} from '../glossary-en';

// Classical Four Pillars cardinality — 10 Heavenly Stems, 12 Earthly Branches. Fixed by the
// system itself (also hardcoded identically in saju-engine/daewoon.ts, _stem-branch.ts, and
// chart-input/_element-tables.ts), so a literal list here is as stable as the engine's own.
const ALL_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;

// Compile-time exhaustiveness guards: if a union type ever gains a member, one of these object
// literals fails to type-check until updated (and the runtime test below then fails too).
const _tenGodExhaustive: Record<TenGod, true> = {
  '비견': true, '겁재': true, '식신': true, '상관': true, '편재': true,
  '정재': true, '편관': true, '정관': true, '편인': true, '정인': true,
};
const _twelveStateExhaustive: Record<TwelveState, true> = {
  '장생': true, '목욕': true, '관대': true, '건록': true, '제왕': true,
  '쇠': true, '병': true, '사': true, '묘': true, '절': true, '태': true, '양': true,
};
const _sinsalExhaustive: Record<SinsalCode, true> = {
  '도화': true, '홍염': true, '역마': true, '화개': true, '천을귀인': true,
};
const _elementExhaustive: Record<Element, true> = { '木': true, '火': true, '土': true, '金': true, '水': true };

describe('glossary-en completeness', () => {
  it('covers all 5 elements', () => {
    for (const el of Object.keys(_elementExhaustive) as Element[]) {
      expect(ELEMENT_GLOSSARY[el], `missing element gloss for ${el}`).toBeDefined();
    }
    expect(Object.keys(ELEMENT_GLOSSARY)).toHaveLength(5);
  });

  it('covers all 10 Heavenly Stems (and each resolves via the engine\'s own stemElement())', () => {
    for (const stem of ALL_STEMS) {
      expect(() => stemElement(stem)).not.toThrow();
      expect(STEM_GLOSSARY[stem], `missing stem gloss for ${stem}`).toBeDefined();
    }
    expect(Object.keys(STEM_GLOSSARY)).toHaveLength(10);
  });

  it('covers all 12 Earthly Branches (sourced from the engine\'s own HIDDEN_STEMS table)', () => {
    const branches = Object.keys(HIDDEN_STEMS);
    expect(branches).toHaveLength(12);
    for (const branch of branches) {
      expect(() => branchElement(branch)).not.toThrow();
      expect(BRANCH_GLOSSARY[branch], `missing branch gloss for ${branch}`).toBeDefined();
    }
    expect(Object.keys(BRANCH_GLOSSARY)).toHaveLength(12);
  });

  it('covers all 10 Ten Gods actually producible by tenGodOf() across every stem pair', () => {
    const produced = new Set<TenGod>();
    for (const a of ALL_STEMS) for (const b of ALL_STEMS) produced.add(tenGodOf(a, b));
    expect(produced.size).toBe(10);
    for (const tg of produced) {
      expect(TEN_GOD_GLOSSARY[tg], `missing ten-god gloss for ${tg}`).toBeDefined();
    }
    expect(Object.keys(TEN_GOD_GLOSSARY)).toHaveLength(10);
  });

  it('covers all 12 Twelve Stages actually producible by twelveStateOf() across every stem×branch', () => {
    const branches = Object.keys(HIDDEN_STEMS);
    const produced = new Set<TwelveState>();
    for (const stem of ALL_STEMS) for (const branch of branches) produced.add(twelveStateOf(stem, branch));
    expect(produced.size).toBe(12);
    for (const state of produced) {
      expect(TWELVE_STATE_GLOSSARY[state], `missing twelve-state gloss for ${state}`).toBeDefined();
    }
    expect(Object.keys(TWELVE_STATE_GLOSSARY)).toHaveLength(12);
  });

  it('covers all 5 Sinsal codes', () => {
    for (const code of Object.keys(_sinsalExhaustive) as SinsalCode[]) {
      expect(SINSAL_GLOSSARY[code], `missing sinsal gloss for ${code}`).toBeDefined();
    }
    expect(Object.keys(SINSAL_GLOSSARY)).toHaveLength(5);
  });

  it('covers both polarities', () => {
    expect(POLARITY_GLOSSARY['양']).toBeDefined();
    expect(POLARITY_GLOSSARY['음']).toBeDefined();
    expect(Object.keys(POLARITY_GLOSSARY)).toHaveLength(2);
  });

  it('every entry has non-empty en/gloss text', () => {
    const all = { ...ELEMENT_GLOSSARY, ...STEM_GLOSSARY, ...BRANCH_GLOSSARY, ...TEN_GOD_GLOSSARY, ...TWELVE_STATE_GLOSSARY, ...SINSAL_GLOSSARY, ...POLARITY_GLOSSARY };
    for (const [ko, entry] of Object.entries(all)) {
      expect(entry.en.length, `empty 'en' for ${ko}`).toBeGreaterThan(0);
      expect(entry.gloss.length, `empty 'gloss' for ${ko}`).toBeGreaterThan(0);
    }
  });

  it('the "양" collision (Yang polarity vs. Nurture twelve-stage) is resolved by category, not by the flat map', () => {
    expect(glossOf('polarity', '양').en).toBe('Yang');
    expect(glossOf('twelveState', '양').en).toBe('Nurture');
    // The flat GLOSSARY_EN deliberately excludes both colliding categories.
    expect(GLOSSARY_EN['양']).toBeUndefined();
  });

  it('glossOf throws on an unknown label instead of silently leaking Korean text', () => {
    expect(() => glossOf('element', '???')).toThrow();
  });
});
