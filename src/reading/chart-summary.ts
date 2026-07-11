import type { FullSajuChart, Pillar } from '../saju-engine';

const fmt = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

// 한자 → 한글 변환표. 요약에 한자가 섞이면 LLM이 그대로 따라 써 사용자가 읽기 어려우므로,
// 프롬프트에 넣기 전 천간·지지·오행을 모두 한글로 옮긴다.
const STEM_KO: Record<string, string> = {
  甲: '갑', 乙: '을', 丙: '병', 丁: '정', 戊: '무',
  己: '기', 庚: '경', 辛: '신', 壬: '임', 癸: '계',
};
const BRANCH_KO: Record<string, string> = {
  子: '자', 丑: '축', 寅: '인', 卯: '묘', 辰: '진', 巳: '사',
  午: '오', 未: '미', 申: '신', 酉: '유', 戌: '술', 亥: '해',
};
const STEM_ELEMENT_KO: Record<string, string> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
};

const stemKo = (s: string): string => STEM_KO[s] ?? s;
const branchKo = (b: string): string => BRANCH_KO[b] ?? b;

function pillarStr(label: string, p: Pillar | undefined): string {
  return p ? `${label} ${stemKo(p.stem)}${branchKo(p.branch)}` : `${label} (미상)`;
}

/** FullSajuChart → 프롬프트에 넣을 사람 친화 사주 요약. 결정론적. 한자 없이 한글로만. */
export function buildChartSummary(c: FullSajuChart): string {
  const p = c.base.pillars;
  const e = c.elements;
  const tg = c.tenGods;
  const hourStr = c.base.timeUnknown ? '시주 (출생시각 미상)' : pillarStr('시주', p.hour);
  const dayStemKo = `${stemKo(c.dayStem)}(${STEM_ELEMENT_KO[c.dayStem] ?? '?'})`;

  const lines: string[] = [];
  lines.push(`- 사주 네 기둥: ${pillarStr('연주', p.year)} / ${pillarStr('월주', p.month)} / ${pillarStr('일주', p.day)} / ${hourStr}`);
  lines.push(`- 일간(나 자신): ${dayStemKo}`);
  lines.push(`- 오행 분포: 목 ${fmt(e.木)} / 화 ${fmt(e.火)} / 토 ${fmt(e.土)} / 금 ${fmt(e.金)} / 수 ${fmt(e.水)}`);
  lines.push(`- 십신(연/월/일/시 지지): ${tg.year.branch} / ${tg.month.branch} / ${tg.day.branch}${tg.hour ? ` / ${tg.hour.branch}` : ''}`);
  lines.push(`- 십신(연/월 천간): ${tg.year.stem ?? '-'} / ${tg.month.stem ?? '-'}`);
  lines.push(`- 12운성(연/월/일): ${c.twelveStates.year} / ${c.twelveStates.month} / ${c.twelveStates.day}`);
  lines.push(`- 주요 신살: ${c.sinsal.length ? c.sinsal.join(', ') : '특별히 두드러진 신살 없음'}`);
  lines.push(`- 대운: ${c.daewoon.forward ? '순행' : '역행'}, ${c.daewoon.startAge}세부터`);
  return lines.join('\n');
}
