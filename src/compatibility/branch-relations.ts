// 일지(日支) 지지 관계 — 육합·충만 v1에서 판정(삼합·형·해는 후속).
const YUKHAP: ReadonlyArray<readonly [string, string]> = [
  ['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未'],
];
const CHUNG: ReadonlyArray<readonly [string, string]> = [
  ['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
];

function inPairs(pairs: ReadonlyArray<readonly [string, string]>, x: string, y: string): boolean {
  return pairs.some(([p, q]) => (p === x && q === y) || (p === y && q === x));
}

/** 두 지지가 육합(六合) 관계인가. */
export function isYukhap(a: string, b: string): boolean {
  return inPairs(YUKHAP, a, b);
}

/** 두 지지가 충(六沖) 관계인가. */
export function isChung(a: string, b: string): boolean {
  return inPairs(CHUNG, a, b);
}
