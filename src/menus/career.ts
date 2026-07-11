import { buildChartSummaryEn } from '../reading/chart-summary-en';
import { READING_PROMPT_VERSION } from '../reading/prompts/frame-en-v1';
import type { MenuInput, MenuResult, MenuDeps } from './types';
import { buildMenuSystemBlocks, buildMenuUserPrompt } from './prompts-en';
import { generateSection } from './_generate-section';
import { buildTeaserEn } from './teaser-en';
import { applyPaywall } from './paywall';

/** 직업·적성운 — 본인 사주 단독, 십신(관성/식상/재성)·오행 중심 단일 섹션. */
export async function runCareer(
  input: Extract<MenuInput, { menu: 'career' }>,
  deps: MenuDeps,
): Promise<MenuResult> {
  const summary = input.subject.chartSummary ?? buildChartSummaryEn(input.subject.chart);
  const system = buildMenuSystemBlocks('career');
  const user = buildMenuUserPrompt(summary);
  const section = await generateSection('career', '직업·적성운', user, deps, system);
  const sections = [section];
  const result: MenuResult = {
    menu: 'career',
    sections,
    teaser: buildTeaserEn(sections),
    locked: false,
    promptVersion: READING_PROMPT_VERSION,
    partial: !section.ok,
  };
  return applyPaywall(result, deps.unlocked ?? false);
}
