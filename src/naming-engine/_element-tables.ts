// 천간/지지/지장간 → 오행 매핑 + 오행 상생·상극 관계 + 표준 지장간 표.
// 출처마다 일부 차이가 있는 *관례값* — M3 실데이터 단계에서 출처를 명시해 확정한다(TODOS #6).
import type { Element } from './types';

/** 천간 10개 → 오행. 甲乙=木 / 丙丁=火 / 戊己=土 / 庚辛=金 / 壬癸=水 */
const STEM_ELEMENT: Record<string, Element> = {
  甲: '木', 乙: '木',
  丙: '火', 丁: '火',
  戊: '土', 己: '土',
  庚: '金', 辛: '金',
  壬: '水', 癸: '水',
};

/** 지지 12개 → 본기 오행. 寅卯=木 / 巳午=火 / 辰戌丑未=土 / 申酉=金 / 亥子=水 */
const BRANCH_ELEMENT: Record<string, Element> = {
  寅: '木', 卯: '木',
  巳: '火', 午: '火',
  辰: '土', 戌: '土', 丑: '土', 未: '土',
  申: '金', 酉: '金',
  亥: '水', 子: '水',
};

export function stemElement(stem: string): Element {
  const e = STEM_ELEMENT[stem];
  if (!e) throw new Error(`_element-tables: 알 수 없는 천간 "${stem}"`);
  return e;
}

export function branchElement(branch: string): Element {
  const e = BRANCH_ELEMENT[branch];
  if (!e) throw new Error(`_element-tables: 알 수 없는 지지 "${branch}"`);
  return e;
}

/** 지장간(숨은 천간)의 오행 — 천간이므로 stemElement 와 동일. */
export function hiddenStemElement(stem: string): Element {
  return stemElement(stem);
}

// ── 오행 상생·상극 ──
const SAENG_NEXT: Record<Element, Element> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const GEUK_NEXT: Record<Element, Element> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

/** a 가 b 를 생(生)하는가 — 木→火→土→金→水→木 */
export function sangSaeng(a: Element, b: Element): boolean {
  return SAENG_NEXT[a] === b;
}

/** a 가 b 를 극(剋)하는가 — 木→土→水→火→金→木 */
export function sangGeuk(a: Element, b: Element): boolean {
  return GEUK_NEXT[a] === b;
}

// ── 표준 지장간 표 (지지 → {본기 ki, 중기 jung?, 여기 yeo?}) ──
// 子·卯·酉·亥·午 는 중기 또는 여기가 비는 관례를 따른다(월률분야 통용표 기준).
export const HIDDEN_STEMS: Record<string, { ki: string; jung?: string; yeo?: string }> = {
  子: { ki: '癸', yeo: '壬' },
  丑: { ki: '己', jung: '癸', yeo: '辛' },
  寅: { ki: '甲', jung: '丙', yeo: '戊' },
  卯: { ki: '乙', yeo: '甲' },
  辰: { ki: '戊', jung: '乙', yeo: '癸' },
  巳: { ki: '丙', jung: '庚', yeo: '戊' },
  午: { ki: '丁', jung: '己' },
  未: { ki: '己', jung: '丁', yeo: '乙' },
  申: { ki: '庚', jung: '壬', yeo: '戊' },
  酉: { ki: '辛', yeo: '庚' },
  戌: { ki: '戊', jung: '辛', yeo: '丁' },
  亥: { ki: '壬', jung: '甲' },
};
