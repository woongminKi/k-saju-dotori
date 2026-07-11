import { describe, it, expect } from 'vitest';
import { countElements } from '../five-elements';
import type { SajuChart } from '../../naming-engine/types';
import { HIDDEN_STEMS } from '../../naming-engine/_element-tables';

function pillar(stem: string, branch: string) {
  return { stem, branch, hiddenStems: HIDDEN_STEMS[branch]! };
}

describe('countElements', () => {
  it('천간1.0 + 본기1.0 + 중기/여기 0.3 가중으로 합산한다', () => {
    const chart: SajuChart = {
      pillars: { year: pillar('甲', '子'), month: pillar('甲', '子'), day: pillar('甲', '子') },
      timeUnknown: true,
    };
    const c = countElements(chart);
    expect(c.木).toBeCloseTo(3.0, 5);
    expect(c.水).toBeCloseTo(3.9, 5);
    expect(c.火).toBe(0);
  });
  it('시주가 있으면 hour 기둥도 포함한다', () => {
    const chart: SajuChart = {
      pillars: { year: pillar('丙', '午'), month: pillar('丙', '午'), day: pillar('丙', '午'), hour: pillar('丙', '午') },
      timeUnknown: false,
    };
    const c = countElements(chart);
    expect(c.火).toBeCloseTo(8.0, 5);
    expect(c.土).toBeCloseTo(1.2, 5);
  });
});
