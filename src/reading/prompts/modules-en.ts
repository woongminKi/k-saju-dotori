// Solo reading module prompts — English re-authoring of the Korean modules.ts for the Dotori
// voice (warm, playful best friend; see frame-en-v1.ts and ENGINE_SYNC.md Phase 2 section).
import type { ReadingModuleId } from '../types';
import type { LlmSystemBlock } from '../../naming-engine/llm';
import { SHARED_SYSTEM_BLOCK1 } from './frame-en-v1';

interface ModuleSpec {
  title: string;
  focus: string;
}

export const MODULE_SPECS: Record<ReadingModuleId, ModuleSpec> = {
  ilgan: {
    title: 'Your Day Master',
    focus: `Cover the Day Master's core temperament — the element and polarity at the center of the chart (e.g. Yang Wood, Yin Metal). This is the "main character energy" of the whole chart: the instinctive way this person moves through the world. Cover natural strengths, and the blind spots that come as the flip side of those same strengths (every element has both — don't shy away from the less flattering half). Ground it in something relatable (a season, weather, an object, an animal) rather than abstract personality-trait language.`,
  },
  ilju: {
    title: 'Your Day Pillar',
    focus: `Cover the Day Master and Day Branch together — traditionally the chart's "relationship palace." This combination shapes both a sense of self and tendencies in close, one-on-one relationships (the Day Branch is read for partnership style, not just personality). Cover what this pairing suggests about what this person needs from a partner or a close friend to feel at ease.`,
  },
  ohaeng: {
    title: 'Your Element Balance',
    focus: `Cover the balance of all five elements in the chart — which are abundant, which are thin or missing. For every element that's noticeably low, always do the signature move: name it, then immediately give one concrete, doable everyday remedy (a color, an activity, an environment, a type of person to spend more time with) that leans into that missing energy. Touch all five elements at least briefly, even the well-supported ones, so nothing in the chart summary goes unaddressed.`,
  },
  sipsin: {
    title: 'Your Ten Gods Structure',
    focus: `Cover the Ten Gods that show up in the chart summary and what they suggest about this person's relationship to money, work, and other people. Wealth Star and Structure/Warrior Star (the traditional "partner stars") can be read for relationship tendencies too, not just career and money — mention that angle when it's relevant. Name each Ten God that actually appears in the chart summary; don't skip any of them.`,
  },
  twelveStates: {
    title: 'Your Twelve-Stage Flow',
    focus: `Cover the Twelve Stages present across the year/month/day pillars — the ebb and flow of the Day Master's strength through different phases. Frame it as a rhythm, not a verdict: some stages are about building momentum, some about peak strength, some about rest and quiet regrouping. None of them are "bad" — they're just different seasons of the same chart.`,
  },
  sinsal: {
    title: 'Your Sinsal (Special Stars)',
    focus: `Cover the notable Sinsal (special stars) present in the chart and what each one suggests. Treat these as flavor notes on top of the main chart, not core traits — keep the tone light, specific, and a little fun rather than heavy. If more than one Sinsal is present, weave them into one coherent picture instead of listing them separately.`,
  },
  hapchung: {
    title: 'Your Branch Connections',
    focus: `Cover the pull or friction among the branches across the chart's pillars — where energies naturally combine and support each other, and where they create some tension or push-pull. This is a qualitative, impressionistic read rather than a hard calculation, so hedge accordingly (mid/low confidence) and keep it grounded in relationship/energy dynamics rather than stating it as settled fact.`,
  },
  overall: {
    title: 'Your Overall Read',
    focus: [
      'Summarize the most compelling points from the other modules into the exact format below. Do not invent new facts — only synthesize what has already been said elsewhere.',
      '',
      '[Format — follow exactly]',
      '1) First line: one sentence capturing who this person is, in the warm best-friend voice (e.g. "You\'re the friend who...").',
      '2) Blank line, then "✨ Strengths" — 2-3 short bullet lines.',
      '3) Blank line, then "⚠️ Watch out for" — 1-2 short bullet lines.',
      '4) Blank line, then "🌱 Try this" — 1-2 concrete, doable remedies tied directly to the watch-outs above.',
      '',
      '[Length — must finish within budget]',
      '- Keep the whole thing to about 150-200 words and finish every sentence within that budget. If it starts running long, cut an item rather than let a sentence trail off mid-thought.',
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
Using the voice above, output the reading body text only for '${spec.title}'.
- No JSON, no headers, no title, no code fences — body text only.
- Do not leak internal scores/probabilities or key names (e.g. "breakdown").
- Do not invent facts absent from the chart summary.
- English only — no hanja, no Hangul, no romanized Korean terms.`,
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
