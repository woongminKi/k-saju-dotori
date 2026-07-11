import type { FullSajuChart, ElementCount } from '../saju-engine';
import type { Element } from '../chart-input/types';
import { stemElement, sangSaeng, sangGeuk } from '../chart-input/_element-tables';
import { isYukhap, isChung } from './branch-relations';
import type { CompatScore, CompatTier } from './types';

const W_STEM = 40;
const W_COMPLEMENT = 35;
const W_BRANCH = 25;

const ELEMENTS: readonly Element[] = ['木', '火', '土', '金', '水'];

/** 두 일간 오행 관계 → 0~1. 상생 1.0 / 동일 0.6 / 상극 0.2. */
function dayStemFactor(a: FullSajuChart, b: FullSajuChart): number {
  const ea = stemElement(a.dayStem);
  const eb = stemElement(b.dayStem);
  if (ea === eb) return 0.6;
  if (sangSaeng(ea, eb) || sangSaeng(eb, ea)) return 1.0;
  if (sangGeuk(ea, eb) || sangGeuk(eb, ea)) return 0.2;
  return 0.5; // 5원소에선 도달하지 않음(안전값)
}

/** self의 빈 오행을 other가 채우는 비율 0~1. 빈 오행이 없으면 1.0(이미 균형).
 *  v1은 '부족'을 카운트 0으로 한정(최소값 아님) — 균형 잡힌 사주는 만점 보완 처리. */
function fillRatio(self: ElementCount, other: ElementCount): number {
  const missing = ELEMENTS.filter((e) => self[e] === 0);
  if (missing.length === 0) return 1.0;
  const filled = missing.filter((e) => other[e] > 0).length;
  return filled / missing.length;
}

/** 양방향 보완의 평균 → 0~1(대칭). */
function complementFactor(a: FullSajuChart, b: FullSajuChart): number {
  return (fillRatio(a.elements, b.elements) + fillRatio(b.elements, a.elements)) / 2;
}

/** 일지 합/충 → 육합 1.0 / 충 0.0 / 그 외 0.5. */
function branchFactor(a: FullSajuChart, b: FullSajuChart): number {
  const ba = a.base.pillars.day.branch;
  const bb = b.base.pillars.day.branch;
  if (isYukhap(ba, bb)) return 1.0;
  if (isChung(ba, bb)) return 0.0;
  return 0.5;
}

export function scoreTier(score: number): CompatTier {
  if (score >= 85) return '천생연분';
  if (score >= 65) return '좋음';
  if (score >= 45) return '무난';
  return '노력 필요';
}

export function scoreCompatibility(a: FullSajuChart, b: FullSajuChart): CompatScore {
  const breakdown = {
    dayStemRelation: W_STEM * dayStemFactor(a, b),
    elementComplement: W_COMPLEMENT * complementFactor(a, b),
    branchHarmony: W_BRANCH * branchFactor(a, b),
  };
  const raw = breakdown.dayStemRelation + breakdown.elementComplement + breakdown.branchHarmony;
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  return { score, tier: scoreTier(score), breakdown };
}
