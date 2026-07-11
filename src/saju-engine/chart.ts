// 파사드 — SajuChart를 받아 십신·12운성·오행·신살·대운을 묶은 FullSajuChart 산출.
import type { Pillar, SajuChart } from '../naming-engine/types';
import { tenGodOf } from './ten-gods';
import { twelveStateOf } from './twelve-states';
import { countElements } from './five-elements';
import { detectSinsal } from './sinsal';
import { daewoonDirection, daewoonSteps } from './daewoon';
import type { FullSajuChart, PillarTenGods } from './types';

export interface BuildOptions {
  gender: '남' | '여';
  daewoonStartAge: number;
  daewoonCount: number;
}

function pillarTenGods(dayStem: string, p: Pillar, isDayPillar: boolean): PillarTenGods {
  return {
    stem: isDayPillar ? null : tenGodOf(dayStem, p.stem),
    branch: tenGodOf(dayStem, p.hiddenStems.ki),
  };
}

export function buildFullChart(chart: SajuChart, opts: BuildOptions): FullSajuChart {
  const dayStem = chart.pillars.day.stem;
  const { year, month, day, hour } = chart.pillars;

  const tenGods: FullSajuChart['tenGods'] = {
    year: pillarTenGods(dayStem, year, false),
    month: pillarTenGods(dayStem, month, false),
    day: pillarTenGods(dayStem, day, true),
  };
  if (hour) tenGods.hour = pillarTenGods(dayStem, hour, false);

  const twelveStates: FullSajuChart['twelveStates'] = {
    year: twelveStateOf(dayStem, year.branch),
    month: twelveStateOf(dayStem, month.branch),
    day: twelveStateOf(dayStem, day.branch),
  };
  if (hour) twelveStates.hour = twelveStateOf(dayStem, hour.branch);

  const forward = daewoonDirection(year.stem, opts.gender);
  const monthPillarStr = `${month.stem}${month.branch}`;
  const steps = daewoonSteps(monthPillarStr, forward, opts.daewoonStartAge, opts.daewoonCount);

  return {
    base: chart,
    dayStem,
    tenGods,
    twelveStates,
    elements: countElements(chart),
    sinsal: detectSinsal(chart),
    daewoon: { forward, startAge: opts.daewoonStartAge, steps },
  };
}
