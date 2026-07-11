import { describe, it, expect } from 'vitest';
import { detectSinsal } from '../sinsal';
import type { SajuChart } from '../../naming-engine/types';
import { HIDDEN_STEMS } from '../../naming-engine/_element-tables';

function p(stem: string, branch: string) {
  return { stem, branch, hiddenStems: HIDDEN_STEMS[branch]! };
}

describe('detectSinsal', () => {
  it('일지 午(寅午戌 그룹) + 어딘가 卯 → 도화', () => {
    const chart: SajuChart = {
      pillars: { year: p('甲', '卯'), month: p('甲', '子'), day: p('丙', '午') },
      timeUnknown: true,
    };
    expect(detectSinsal(chart)).toContain('도화');
  });
  it('일간 甲 + 사주에 午 → 홍염', () => {
    const chart: SajuChart = {
      pillars: { year: p('甲', '午'), month: p('甲', '子'), day: p('甲', '寅') },
      timeUnknown: true,
    };
    expect(detectSinsal(chart)).toContain('홍염');
  });
  it('일간 甲 + 사주에 丑 → 천을귀인', () => {
    const chart: SajuChart = {
      pillars: { year: p('甲', '丑'), month: p('甲', '寅'), day: p('甲', '寅') },
      timeUnknown: true,
    };
    expect(detectSinsal(chart)).toContain('천을귀인');
  });
  it('해당 신살이 없으면 빈 배열', () => {
    const chart: SajuChart = {
      pillars: { year: p('甲', '寅'), month: p('甲', '寅'), day: p('甲', '寅') },
      timeUnknown: true,
    };
    expect(detectSinsal(chart)).not.toContain('도화');
  });
});
