import { describe, it, expect } from 'vitest';
import { buildFullChart } from '../chart';
import type { SajuChart } from '../../naming-engine/types';
import { HIDDEN_STEMS } from '../../naming-engine/_element-tables';

function p(stem: string, branch: string) {
  return { stem, branch, hiddenStems: HIDDEN_STEMS[branch]! };
}

const chart: SajuChart = {
  pillars: { year: p('甲', '子'), month: p('丙', '寅'), day: p('庚', '午') },
  timeUnknown: true,
};

describe('buildFullChart', () => {
  it('일간을 노출한다', () => {
    const full = buildFullChart(chart, { gender: '남', daewoonStartAge: 3, daewoonCount: 8 });
    expect(full.dayStem).toBe('庚');
  });
  it('일주 천간의 십신은 null, 년간 십신은 편재', () => {
    const full = buildFullChart(chart, { gender: '남', daewoonStartAge: 3, daewoonCount: 8 });
    expect(full.tenGods.day.stem).toBeNull();
    expect(full.tenGods.year.stem).toBe('편재');
  });
  it('각 지지 12운성을 계산한다 (일간 庚, 午 → 목욕)', () => {
    const full = buildFullChart(chart, { gender: '남', daewoonStartAge: 3, daewoonCount: 8 });
    expect(full.twelveStates.day).toBe('목욕');
  });
  it('시주 없으면 hour 십신·운성은 생략', () => {
    const full = buildFullChart(chart, { gender: '남', daewoonStartAge: 3, daewoonCount: 8 });
    expect(full.tenGods.hour).toBeUndefined();
    expect(full.twelveStates.hour).toBeUndefined();
  });
  it('대운: 년간 甲(양)+남 → 순행, 8스텝', () => {
    const full = buildFullChart(chart, { gender: '남', daewoonStartAge: 3, daewoonCount: 8 });
    expect(full.daewoon.forward).toBe(true);
    expect(full.daewoon.steps).toHaveLength(8);
  });
});
