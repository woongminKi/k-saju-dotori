import { buildChartSummaryEn } from '../reading/chart-summary-en';
import { READING_PROMPT_VERSION } from '../reading/prompts/frame-en-v1';
import type { MenuInput, MenuResult, MenuDeps } from './types';
import { buildMenuSystemBlocks, buildMenuUserPrompt } from './prompts-en';
import { generateSection } from './_generate-section';
import { buildTeaser } from './teaser';
import { applyPaywall } from './paywall';

/** 연애·결혼운 — 본인 사주 단독, 배우자성·일지·도화/홍염 중심 단일 섹션. */
export async function runLoveMarriage(
  input: Extract<MenuInput, { menu: 'love-marriage' }>,
  deps: MenuDeps,
): Promise<MenuResult> {
  const summary = input.subject.chartSummary ?? buildChartSummaryEn(input.subject.chart);
  const system = buildMenuSystemBlocks('love-marriage');
  const user = buildMenuUserPrompt(summary);
  const section = await generateSection('love-marriage', '연애·결혼운', user, deps, system);
  const sections = [section];
  const result: MenuResult = {
    menu: 'love-marriage',
    sections,
    teaser: buildTeaser(sections),
    locked: false,
    promptVersion: READING_PROMPT_VERSION,
    partial: !section.ok,
  };
  return applyPaywall(result, deps.unlocked ?? false);
}
