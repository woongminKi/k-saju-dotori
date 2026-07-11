// 주요 신살 5종 — 관례표 (출처: 통용 신살표, 버전 2026-06-29). 가짜 객관성 회피 고지(PRD §9): 신살은 유파마다 차이.
import type { SajuChart } from '../naming-engine/types';
import type { SinsalCode } from './types';

const SAMHAP: Record<string, { dohwa: string; yeokma: string; hwagae: string }> = {
  寅: { dohwa: '卯', yeokma: '申', hwagae: '戌' }, 午: { dohwa: '卯', yeokma: '申', hwagae: '戌' }, 戌: { dohwa: '卯', yeokma: '申', hwagae: '戌' },
  申: { dohwa: '酉', yeokma: '寅', hwagae: '辰' }, 子: { dohwa: '酉', yeokma: '寅', hwagae: '辰' }, 辰: { dohwa: '酉', yeokma: '寅', hwagae: '辰' },
  巳: { dohwa: '午', yeokma: '亥', hwagae: '丑' }, 酉: { dohwa: '午', yeokma: '亥', hwagae: '丑' }, 丑: { dohwa: '午', yeokma: '亥', hwagae: '丑' },
  亥: { dohwa: '子', yeokma: '巳', hwagae: '未' }, 卯: { dohwa: '子', yeokma: '巳', hwagae: '未' }, 未: { dohwa: '子', yeokma: '巳', hwagae: '未' },
};

const HONGYEOM: Record<string, string> = { 甲: '午', 乙: '午', 丙: '寅', 丁: '未', 戊: '辰', 己: '辰', 庚: '戌', 辛: '酉', 壬: '子', 癸: '申' };

const CHEONEUL: Record<string, string[]> = {
  甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'],
  乙: ['子', '申'], 己: ['子', '申'],
  丙: ['亥', '酉'], 丁: ['亥', '酉'],
  辛: ['寅', '午'],
  壬: ['巳', '卯'], 癸: ['巳', '卯'],
};

export function detectSinsal(chart: SajuChart): SinsalCode[] {
  const pillars = [chart.pillars.year, chart.pillars.month, chart.pillars.day, chart.pillars.hour].filter((x): x is NonNullable<typeof x> => !!x);
  const branches = pillars.map((p) => p.branch);
  const dayStem = chart.pillars.day.stem;
  const dayBranch = chart.pillars.day.branch;
  const yearBranch = chart.pillars.year.branch;
  const found = new Set<SinsalCode>();

  for (const base of [dayBranch, yearBranch]) {
    const g = SAMHAP[base];
    if (!g) continue;
    if (branches.includes(g.dohwa)) found.add('도화');
    if (branches.includes(g.yeokma)) found.add('역마');
    if (branches.includes(g.hwagae)) found.add('화개');
  }

  const hy = HONGYEOM[dayStem];
  if (hy && branches.includes(hy)) found.add('홍염');

  const ce = CHEONEUL[dayStem];
  if (ce && ce.some((b) => branches.includes(b))) found.add('천을귀인');

  return [...found];
}
