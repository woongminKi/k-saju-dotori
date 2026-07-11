import { buildChartSummaryEn } from '../reading/chart-summary-en';
import { READING_PROMPT_VERSION } from '../reading/prompts/frame-en-v1';
import type { MenuInput, MenuResult, MenuDeps } from './types';
import { buildMenuSystemBlocks, buildMenuPairUserPrompt } from './prompts-en';
import { generateSection } from './_generate-section';
import { buildTeaserEn } from './teaser-en';
import { applyPaywall } from './paywall';

/** 궁합 — 두 사람 요약 비교 단일 섹션. (두 풀이 전체 생성 대신 합성 1콜 — YAGNI) */
export async function runCouple(
  input: Extract<MenuInput, { menu: 'couple' }>,
  deps: MenuDeps,
): Promise<MenuResult> {
  const summaryA = input.person.chartSummary ?? buildChartSummaryEn(input.person.chart);
  const summaryB = input.partner.chartSummary ?? buildChartSummaryEn(input.partner.chart);
  const system = buildMenuSystemBlocks('couple');
  const user = buildMenuPairUserPrompt(summaryA, summaryB);
  const section = await generateSection('couple', 'Compatibility', user, deps, system);
  const sections = [section];
  const result: MenuResult = {
    menu: 'couple',
    sections,
    teaser: buildTeaserEn(sections),
    locked: false,
    promptVersion: READING_PROMPT_VERSION,
    partial: !section.ok,
  };
  return applyPaywall(result, deps.unlocked ?? false);
}
