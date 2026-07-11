// English counterpart to chart-summary.ts — builds the human-friendly, LLM-prompt-ready chart
// summary entirely in English via i18n/glossary-en.ts, so no hanja or Korean labels ever reach
// the (English) reading prompts. Field-for-field parity with the Korean buildChartSummary().
import type { FullSajuChart, Pillar } from '../saju-engine';
import { STEM_GLOSSARY, BRANCH_GLOSSARY, TEN_GOD_GLOSSARY, TWELVE_STATE_GLOSSARY, SINSAL_GLOSSARY, ELEMENT_GLOSSARY } from '../i18n/glossary-en';

const fmt = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const stemEn = (s: string): string => STEM_GLOSSARY[s]?.en ?? s;
const branchEn = (b: string): string => BRANCH_GLOSSARY[b]?.en ?? b;
const tenGodEn = (tg: string): string => TEN_GOD_GLOSSARY[tg]?.en ?? tg;
const twelveStateEn = (ts: string): string => TWELVE_STATE_GLOSSARY[ts]?.en ?? ts;
const sinsalEn = (s: string): string => SINSAL_GLOSSARY[s]?.en ?? s;

function pillarStr(label: string, p: Pillar | undefined): string {
  return p ? `${label}: ${stemEn(p.stem)}, ${branchEn(p.branch)}` : `${label}: (unknown)`;
}

/** FullSajuChart → English, LLM-prompt-ready chart summary. Deterministic. No hanja, no Korean. */
export function buildChartSummaryEn(c: FullSajuChart): string {
  const p = c.base.pillars;
  const e = c.elements;
  const tg = c.tenGods;
  const hourStr = c.base.timeUnknown ? 'Hour pillar: (birth time unknown)' : pillarStr('Hour pillar', p.hour);
  const dayMasterEn = stemEn(c.dayStem);

  const lines: string[] = [];
  lines.push(`- Four Pillars: ${pillarStr('Year pillar', p.year)} / ${pillarStr('Month pillar', p.month)} / ${pillarStr('Day pillar', p.day)} / ${hourStr}`);
  lines.push(`- Day Master (self): ${dayMasterEn}`);
  lines.push(`- Five Elements distribution: ${ELEMENT_GLOSSARY['木']!.en} ${fmt(e.木)} / ${ELEMENT_GLOSSARY['火']!.en} ${fmt(e.火)} / ${ELEMENT_GLOSSARY['土']!.en} ${fmt(e.土)} / ${ELEMENT_GLOSSARY['金']!.en} ${fmt(e.金)} / ${ELEMENT_GLOSSARY['水']!.en} ${fmt(e.水)}`);
  lines.push(`- Ten Gods (year/month/day/hour branch): ${tenGodEn(tg.year.branch)} / ${tenGodEn(tg.month.branch)} / ${tenGodEn(tg.day.branch)}${tg.hour ? ` / ${tenGodEn(tg.hour.branch)}` : ''}`);
  lines.push(`- Ten Gods (year/month stem): ${tg.year.stem ? tenGodEn(tg.year.stem) : '-'} / ${tg.month.stem ? tenGodEn(tg.month.stem) : '-'}`);
  lines.push(`- Twelve Stages (year/month/day): ${twelveStateEn(c.twelveStates.year)} / ${twelveStateEn(c.twelveStates.month)} / ${twelveStateEn(c.twelveStates.day)}`);
  lines.push(`- Notable Sinsal (special stars): ${c.sinsal.length ? c.sinsal.map(sinsalEn).join(', ') : 'none especially prominent'}`);
  lines.push(`- Luck pillars (Daewoon): ${c.daewoon.forward ? 'forward' : 'reverse'}, starting at age ${c.daewoon.startAge}`);
  return lines.join('\n');
}
