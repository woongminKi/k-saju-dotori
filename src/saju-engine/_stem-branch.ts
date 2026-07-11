// 천간/지지 음양·순서 — 관례표 (출처: 통용 명리 기본표, 버전 2026-06-29). 결정적.
import type { Polarity } from './types';

const STEM_POLARITY: Record<string, Polarity> = {
  甲: '양', 丙: '양', 戊: '양', 庚: '양', 壬: '양',
  乙: '음', 丁: '음', 己: '음', 辛: '음', 癸: '음',
};

const BRANCH_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

export function stemPolarity(stem: string): Polarity {
  const p = STEM_POLARITY[stem];
  if (!p) throw new Error(`_stem-branch: 알 수 없는 천간 "${stem}"`);
  return p;
}

export function branchIndex(branch: string): number {
  const i = BRANCH_ORDER.indexOf(branch as typeof BRANCH_ORDER[number]);
  if (i < 0) throw new Error(`_stem-branch: 알 수 없는 지지 "${branch}"`);
  return i;
}
