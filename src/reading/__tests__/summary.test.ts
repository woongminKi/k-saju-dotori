// English re-creation of the test dropped in Phase 0 (deviation #5) — the Korean original
// asserted literal Korean strings from the Korean teaser prompt, which no longer exist now that
// teaser-en.ts is fully authored (Phase 2). Same test intent, English markers.
import { it, expect, describe, vi } from 'vitest';
import { generateSummary } from '../summary';
import { buildTeaserPrompt, TEASER_PROMPT_VERSION } from '../prompts/teaser-en';
import type { ReadingInput, ReadingDeps } from '../types';
import type { LlmClient } from '../../llm';
import type { FullSajuChart } from '../../saju-engine';

function makeChart(): FullSajuChart {
  return {
    base: {
      pillars: {
        year: { stem: '甲', branch: '子', hiddenStems: { ki: '癸' } },
        month: { stem: '丙', branch: '寅', hiddenStems: { ki: '甲' } },
        day: { stem: '庚', branch: '午', hiddenStems: { ki: '丁' } },
        hour: { stem: '壬', branch: '申', hiddenStems: { ki: '庚' } },
      },
      timeUnknown: false,
    },
    dayStem: '庚',
    tenGods: {
      year: { stem: '편재', branch: '상관' },
      month: { stem: '편관', branch: '편재' },
      day: { stem: null, branch: '정관' },
      hour: { stem: '식신', branch: '비견' },
    },
    twelveStates: { year: '사', month: '절', day: '목욕', hour: '건록' },
    elements: { 木: 2, 火: 2, 土: 0.3, 金: 2, 水: 1.6 },
    sinsal: ['도화'],
    daewoon: { forward: true, startAge: 3, steps: [] },
  };
}

const input: ReadingInput = { chart: makeChart() };

describe('buildTeaserPrompt', () => {
  it('carries the chart summary, a curiosity-gap instruction, and a length rule', () => {
    const p = buildTeaserPrompt('- Day Master: Yang Metal');
    expect(p).toContain('- Day Master: Yang Metal');
    expect(p).toContain('curiosity gap');
    expect(p).toContain('teaser');
    expect(p).toContain('40-70 words');
  });
});

describe('generateSummary', () => {
  it('returns a teaser body from a single LLM call', async () => {
    const complete = vi.fn().mockResolvedValue("You're the friend who runs on Wood energy — always mid-project. The full reading gets into exactly why.");
    const deps: ReadingDeps = { llm: { complete } as LlmClient };

    const teaser = await generateSummary(input, deps);

    expect(teaser).toContain('full reading');
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('retries on a raw-data leak and eventually throws', async () => {
    const complete = vi.fn().mockResolvedValue('Your breakdown score is 0.91.');
    const deps: ReadingDeps = { llm: { complete } as LlmClient, moduleRetries: 1 };

    await expect(generateSummary(input, deps)).rejects.toThrow('티저 요약 생성 실패');
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it('retries on a CJK leak and eventually throws', async () => {
    const complete = vi.fn().mockResolvedValue('Your Day Master is 庚金, a steady presence.');
    const deps: ReadingDeps = { llm: { complete } as LlmClient, moduleRetries: 0 };

    await expect(generateSummary(input, deps)).rejects.toThrow('티저 요약 생성 실패');
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('exposes the prompt version constant', () => {
    expect(TEASER_PROMPT_VERSION).toBeTruthy();
  });
});
