import { describe, it, expect } from 'vitest';
import { buildChartSummary } from '../chart-summary';
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

describe('buildChartSummary', () => {
  it('네 기둥·일간·오행·신살·대운을 한글로 옮긴 요약 문자열을 만든다', () => {
    const s = buildChartSummary(makeChart());
    expect(s).toContain('경오'); // 庚午 → 한글
    expect(s).toContain('일간');
    expect(s).toContain('경(금)'); // 일간 한글 + 오행
    expect(s).toContain('도화');
    expect(s).toContain('순행');
    expect(s).not.toMatch(/[\u4e00-\u9fff]/); // 한자 미포함
  });

  it('시각 미상이면 시주를 미상으로 표기한다', () => {
    const c = makeChart();
    c.base.timeUnknown = true;
    delete c.base.pillars.hour;
    const s = buildChartSummary(c);
    expect(s).toContain('미상');
  });
});
