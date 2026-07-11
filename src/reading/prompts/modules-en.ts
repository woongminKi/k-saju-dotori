import type { ReadingModuleId } from '../types';
import type { LlmSystemBlock } from '../../naming-engine/llm';
import { SHARED_SYSTEM_BLOCK1 } from './frame-en-v1';

interface ModuleSpec {
  title: string;
  focus: string;
}

// TODO(Phase 2): re-author focus text with full English interpretation guidance per module
// (mirrors Korean reading/prompts/modules.ts MODULE_SPECS).
export const MODULE_SPECS: Record<ReadingModuleId, ModuleSpec> = {
  ilgan: { title: 'Day Master essence', focus: 'Cover the core temperament from the Day Master element/polarity. [TODO(Phase 2)]' },
  ilju: { title: 'Day Pillar analysis', focus: 'Cover self-nature and spouse-palace tendencies from the Day Pillar. [TODO(Phase 2)]' },
  ohaeng: { title: 'Five Elements balance', focus: 'Cover element distribution surplus/deficiency and remedies. [TODO(Phase 2)]' },
  sipsin: { title: 'Ten Gods structure', focus: 'Cover wealth/work/relationship tendencies from Ten Gods distribution. [TODO(Phase 2)]' },
  twelveStates: { title: 'Twelve Stages strength', focus: 'Cover strength/weakness flow from the Twelve Stages. [TODO(Phase 2)]' },
  sinsal: { title: 'Key Sinsal (special stars)', focus: 'Cover the implications of notable Sinsal present. [TODO(Phase 2)]' },
  hapchung: { title: 'Branch combinations/clashes', focus: 'Cover the qualitative pull/conflict among branches. [TODO(Phase 2)]' },
  overall: {
    title: 'Overall summary',
    focus: [
      'Summarize the most salient points from prior modules into the fixed format below. Do not invent new facts.',
      '',
      '[Format — follow exactly]',
      '1) First line: one sentence describing who this person is.',
      '2) Blank line, then "✨ Strengths" — 2-3 bullet lines.',
      '3) Blank line, then "⚠️ Watch out for" — 1-2 bullet lines.',
      '4) Blank line, then "🌱 Try this" — 1-2 actionable remedies.',
      '',
      '[Length — must finish within budget]',
      '- Keep the whole thing under ~400-500 characters and finish every sentence within that budget.',
    ].join('\n'),
  },
};

/**
 * Static part of the module prompt (system blocks), split for Anthropic prompt caching:
 *   block1 = role + TONE + FRAME (shared across all 8 modules)
 *   block2 = per-module focus + output rules
 */
export function buildModuleSystemBlocks(module: ReadingModuleId): LlmSystemBlock[] {
  const spec = MODULE_SPECS[module];
  return [
    {
      type: 'text',
      text: SHARED_SYSTEM_BLOCK1,
      cache_control: { type: 'ephemeral' },
    },
    {
      type: 'text',
      text: `[This module's focus — '${spec.title}']
${spec.focus}

[Output]
Using the [tone] above, output the reading body text only for '${spec.title}'.
- No JSON/headers/title/code fences — body text only.
- Do not leak internal scores/probabilities or English key names (e.g. breakdown).
- Do not invent facts absent from the chart summary.`,
      cache_control: { type: 'ephemeral' },
    },
  ];
}

/** Dynamic part of the module prompt (user message). */
export function buildModuleUserPrompt(
  module: ReadingModuleId,
  chartSummary: string,
  priorBodies?: string[],
): string {
  const priorBlock =
    module === 'overall' && priorBodies && priorBodies.length
      ? `\n\n[Prior module output — weave into one coherent piece without contradiction]\n${priorBodies
          .map((b, i) => `(${i + 1}) ${b}`)
          .join('\n\n')}`
      : '';

  return `[Chart summary]
${chartSummary}${priorBlock}`;
}

/** (Back-compat) static + dynamic joined into a single prompt string. */
export function buildModulePrompt(
  module: ReadingModuleId,
  chartSummary: string,
  priorBodies?: string[],
): string {
  const system = buildModuleSystemBlocks(module)
    .map((b) => b.text)
    .join('\n\n');
  return `${system}\n\n${buildModuleUserPrompt(module, chartSummary, priorBodies)}`;
}
