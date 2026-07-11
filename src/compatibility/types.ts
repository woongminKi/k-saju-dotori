export type CompatTier = '천생연분' | '좋음' | '무난' | '노력 필요';

/** 각 요소의 가중 기여분(점, 반올림 전 실수). 합계 ≈ score. */
export interface CompatBreakdown {
  dayStemRelation: number;   // 일간 오행 상생상극 (최대 40)
  elementComplement: number; // 오행 상호보완 (최대 35)
  branchHarmony: number;     // 일지 합/충 (최대 25)
}

export interface CompatScore {
  score: number; // 0~100 정수
  tier: CompatTier;
  breakdown: CompatBreakdown;
}
