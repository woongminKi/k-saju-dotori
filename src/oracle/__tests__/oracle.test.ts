// English re-creation of the test dropped in Phase 0 (deviation #5) — the Korean original
// asserted `findQuestion('career-1')?.text` contains '이직' (Korean for "job change"), which
// doesn't exist in the (now fully authored, Phase 2) English question bank. Same test intent,
// English question bank + English prompt markers.
import { describe, it, expect, vi } from 'vitest';
import { drawOracle, ORACLE_CATEGORIES, findQuestion, ORACLE_PROMPT_VERSION } from '../index';
import { buildOraclePrompt } from '../prompt-en';
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

describe('ORACLE_CATEGORIES', () => {
  it('6 categories, 20 questions each — sized like the Korean original', () => {
    expect(ORACLE_CATEGORIES).toHaveLength(6);
    for (const c of ORACLE_CATEGORIES) {
      expect(c.questions).toHaveLength(20);
      expect(c.label.length).toBeGreaterThan(0);
    }
  });

  it('question ids are all unique', () => {
    const ids = ORACLE_CATEGORIES.flatMap((c) => c.questions.map((q) => q.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('findQuestion looks up by id', () => {
    expect(findQuestion('career-1')?.text).toContain('raise');
    expect(findQuestion('crush-1')?.text).toContain('text');
    expect(findQuestion('no-such-id')).toBeUndefined();
  });
});

describe('buildOraclePrompt', () => {
  it('carries the chart summary, the question, JSON output format, and the acorn framing', () => {
    const p = buildOraclePrompt('- Day Master: Yang Metal', 'Should I text them first?');
    expect(p).toContain('Should I text them first?');
    expect(p).toContain('"answer"');
    expect(p).toContain('"reason"');
    expect(p).toContain('acorn');
  });
});

describe('drawOracle', () => {
  it('parses a clean JSON LLM response into answer/reason', async () => {
    const complete = vi
      .fn()
      .mockResolvedValue('{"answer":"The door\'s open — walk through it slowly.","reason":"Your Peer Star energy likes a steady approach, not a rush."}');
    const r = await drawOracle({ chart: makeChart(), question: 'Should I text them first?' }, {
      llm: { complete } as LlmClient,
    });
    expect(r.answer).toContain('door');
    expect(r.reason).toContain('Peer Star');
    expect(r.question).toBe('Should I text them first?');
    expect(r.promptVersion).toBe(ORACLE_PROMPT_VERSION);
  });

  it('parses a response wrapped in a code fence', async () => {
    const complete = vi
      .fn()
      .mockResolvedValue('```json\n{"answer":"Send it, keep it short.","reason":"The energy is on your side this week."}\n```');
    const r = await drawOracle({ chart: makeChart(), question: 'Should I start a business?' }, {
      llm: { complete } as LlmClient,
    });
    expect(r.answer).toBe('Send it, keep it short.');
  });

  it('throws on a malformed response', async () => {
    const complete = vi.fn().mockResolvedValue('just some plain text, not JSON');
    await expect(
      drawOracle({ chart: makeChart(), question: 'q' }, { llm: { complete } as LlmClient }),
    ).rejects.toThrow();
  });
});
