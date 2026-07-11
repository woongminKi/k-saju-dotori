import { describe, it, expect } from 'vitest';
import { scoreCompatibility } from '../score';
import type { FullSajuChart, ElementCount } from '../../saju-engine';

function el(m: number, f: number, t: number, g: number, w: number): ElementCount {
  return { 木: m, 火: f, 土: t, 金: g, 水: w };
}

// score.ts는 dayStem, elements, base.pillars.day.branch 만 읽는다. 나머지는 더미.
function mkChart(dayStem: string, dayBranch: string, elements: ElementCount): FullSajuChart {
  return {
    base: {
      pillars: {
        year: { stem: '甲', branch: '子', hiddenStems: { ki: '癸' } },
        month: { stem: '甲', branch: '子', hiddenStems: { ki: '癸' } },
        day: { stem: dayStem, branch: dayBranch, hiddenStems: { ki: '癸' } },
      },
      timeUnknown: true,
    },
    dayStem,
    elements,
  } as unknown as FullSajuChart;
}

describe('compatibility/score', () => {
  it('점수는 항상 0~100 정수', () => {
    const a = mkChart('甲', '子', el(2, 1, 1, 1, 1));
    const b = mkChart('丙', '午', el(1, 2, 1, 1, 1));
    const r = scoreCompatibility(a, b);
    expect(Number.isInteger(r.score)).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it('일간 상생(木→火) + 일지 육합(子丑)이 상극+충보다 높다', () => {
    // 상생 일간 甲(木)·丙(火), 일지 子丑 육합
    const good = scoreCompatibility(
      mkChart('甲', '子', el(1, 1, 1, 1, 1)),
      mkChart('丙', '丑', el(1, 1, 1, 1, 1)),
    );
    // 상극 일간 甲(木)·戊(土), 일지 子午 충
    const bad = scoreCompatibility(
      mkChart('甲', '子', el(1, 1, 1, 1, 1)),
      mkChart('戊', '午', el(1, 1, 1, 1, 1)),
    );
    expect(good.score).toBeGreaterThan(bad.score);
  });

  it('교환 대칭: score(a,b) === score(b,a)', () => {
    const a = mkChart('甲', '子', el(2, 0, 1, 1, 0));
    const b = mkChart('庚', '丑', el(0, 1, 1, 2, 1));
    expect(scoreCompatibility(a, b).score).toBe(scoreCompatibility(b, a).score);
  });

  it('오행 상호보완: 서로 빈 오행을 채우면 보완 기여분이 최대에 가깝다', () => {
    // A는 火土金水 0(木만), B는 木 0이고 나머지 보유 → 상호보완 높음
    const a = mkChart('甲', '寅', el(4, 0, 0, 0, 0));
    const b = mkChart('丙', '亥', el(0, 1, 1, 1, 1));
    const r = scoreCompatibility(a, b);
    expect(r.breakdown.elementComplement).toBeGreaterThan(17); // 35의 절반 초과
  });

  it('등급 경계: 완전 무보완·상극·충이면 노력 필요', () => {
    // 상극 일간(甲木·戊土), 일지 충(子午), 상호보완 0(양쪽 동일 분포로 빈칸 없음)
    const r = scoreCompatibility(
      mkChart('甲', '子', el(1, 1, 1, 1, 1)),
      mkChart('戊', '午', el(1, 1, 1, 1, 1)),
    );
    expect(r.tier).toBe('노력 필요');
  });
});
