// 대운 — 방향(년간 음양×성별) + 월주 기준 60갑자 전개. 시작나이는 호출자가 제공(입절 정밀계산은 후속 보강).
import { stemPolarity } from './_stem-branch';
import type { DaewoonStep } from './types';

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

function ganjiIndex(pillar: string): number {
  const s = STEMS.indexOf(pillar[0] as typeof STEMS[number]);
  const b = BRANCHES.indexOf(pillar[1] as typeof BRANCHES[number]);
  if (s < 0 || b < 0) throw new Error(`daewoon: 잘못된 간지 "${pillar}"`);
  for (let i = 0; i < 60; i++) if (i % 10 === s && i % 12 === b) return i;
  throw new Error(`daewoon: 존재하지 않는 간지 조합 "${pillar}"`);
}

function ganjiAt(index: number): { stem: string; branch: string } {
  const i = ((index % 60) + 60) % 60;
  return { stem: STEMS[i % 10]!, branch: BRANCHES[i % 12]! };
}

export function daewoonDirection(yearStem: string, gender: '남' | '여'): boolean {
  const yang = stemPolarity(yearStem) === '양';
  return (yang && gender === '남') || (!yang && gender === '여');
}

export function daewoonSteps(monthPillar: string, forward: boolean, startAge: number, count: number): DaewoonStep[] {
  const base = ganjiIndex(monthPillar);
  const out: DaewoonStep[] = [];
  for (let k = 1; k <= count; k++) {
    const gj = ganjiAt(base + (forward ? k : -k));
    out.push({ age: startAge + (k - 1) * 10, stem: gj.stem, branch: gj.branch });
  }
  return out;
}
