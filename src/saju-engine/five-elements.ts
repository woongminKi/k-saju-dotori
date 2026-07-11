// 오행 분포 카운트 — 천간1.0 / 본기1.0 / 중기·여기 0.3 (naming-engine supplement-resolver 동일 관례).
import { stemElement, branchElement, hiddenStemElement } from '../naming-engine/_element-tables';
import type { Pillar, SajuChart } from '../naming-engine/types';
import type { ElementCount } from './types';

function addPillar(acc: ElementCount, p: Pillar): void {
  acc[stemElement(p.stem)] += 1.0;
  acc[branchElement(p.branch)] += 1.0;
  if (p.hiddenStems.jung) acc[hiddenStemElement(p.hiddenStems.jung)] += 0.3;
  if (p.hiddenStems.yeo) acc[hiddenStemElement(p.hiddenStems.yeo)] += 0.3;
}

export function countElements(chart: SajuChart): ElementCount {
  const acc: ElementCount = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  addPillar(acc, chart.pillars.year);
  addPillar(acc, chart.pillars.month);
  addPillar(acc, chart.pillars.day);
  if (chart.pillars.hour) addPillar(acc, chart.pillars.hour);
  return acc;
}
