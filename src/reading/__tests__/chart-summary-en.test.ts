import { describe, it, expect } from 'vitest';
import { buildChartSummaryEn } from '../chart-summary-en';
import type { FullSajuChart } from '../../saju-engine';

function makeChart(): FullSajuChart {
  return {
    base: {
      pillars: {
        year: { stem: '甲', branch: '子', hiddenStems: { ki: '癸' } },
        month: { stem: '丙', branch: '寅', hiddenStems: { ki: '甲' } },
        day: { stem: '庚', branch: '午', hiddenStems: { ki: '丁' } },
        hour: { stem: '壬', branch: '申', hiddenStems: { ki: '庚' } },
      },
      timeUnknown: false,
    },
    dayStem: '庚',
    tenGods: {
      year: { stem: '편재', branch: '상관' },
      month: { stem: '편관', branch: '편재' },
      day: { stem: null, branch: '정관' },
      hour: { stem: '식신', branch: '비견' },
    },
    twelveStates: { year: '사', month: '절', day: '목욕', hour: '건록' },
    elements: { 木: 2, 火: 2, 土: 0.3, 金: 2, 水: 1.6 },
    sinsal: ['도화', '역마'],
    daewoon: { forward: true, startAge: 3, steps: [{ age: 3, stem: '丁', branch: '卯' }] },
  };
}

// Han ideographs (hanja) and Hangul syllables — the English summary must contain neither.
const CJK_LEAK_RE = /[一-鿿가-힣]/;

describe('buildChartSummaryEn', () => {
  it('produces an all-English summary of the four pillars, day master, elements, sinsal, daewoon', () => {
    const s = buildChartSummaryEn(makeChart());
    expect(s).toContain('Yang Metal'); // day master 庚 → Yang Metal
    expect(s).toContain('Day Master');
    expect(s).toContain('Peach Blossom'); // 도화
    expect(s).toContain('Traveling Horse'); // 역마
    expect(s).toContain('forward');
    expect(s).not.toMatch(CJK_LEAK_RE);
  });

  it('marks the hour pillar as unknown when timeUnknown is set, without throwing', () => {
    const c = makeChart();
    c.base.timeUnknown = true;
    delete c.base.pillars.hour;
    delete c.tenGods.hour;
    delete c.twelveStates.hour;
    const s = buildChartSummaryEn(c);
    expect(s).toContain('unknown');
    expect(s).not.toMatch(CJK_LEAK_RE);
  });

  it('translates every Ten God, Twelve Stage, and Sinsal code reachable from the engine (cross-glossary sanity)', () => {
    const s = buildChartSummaryEn(makeChart());
    // Every Korean field value in the fixture should have surfaced as its English gloss, not as
    // itself or as a raw Korean string.
    expect(s).toContain('Indirect Wealth'); // 편재
    expect(s).toContain('Hurting Officer'); // 상관
    expect(s).toContain('Seven Killings'); // 편관
    expect(s).toContain('Direct Officer'); // 정관
    expect(s).toContain('Companion'); // 비견 (hour-branch Ten God)
    expect(s).toContain('Death'); // 사
    expect(s).toContain('Extinction'); // 절
    expect(s).toContain('Bath'); // 목욕
  });
});
