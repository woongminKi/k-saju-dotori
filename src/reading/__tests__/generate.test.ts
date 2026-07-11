// English re-creation of the test dropped in Phase 0 (deviation #5) — the Korean original
// asserted literal Korean strings from SHARED_SYSTEM_BLOCK1/MODULE_SPECS that no longer exist
// now that frame-en-v1.ts/modules-en.ts are fully authored (Phase 2). Same test intent, English
// markers.
import { it, expect, vi } from 'vitest';
import { generateReading, startReading } from '../generate';
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

it('generates all 6 modules, with overall last', async () => {
  const complete = vi.fn().mockResolvedValue('A clean, steady reading body.');
  const deps: ReadingDeps = { llm: { complete } as LlmClient };

  const r = await generateReading(input, deps);

  expect(r.modules).toHaveLength(6);
  expect(r.modules.map((m) => m.module)).toEqual([
    'ilgan', 'ilju', 'ohaeng', 'sipsin', 'sinsal', 'overall',
  ]);
  expect(r.modules.every((m) => m.ok)).toBe(true);
  expect(r.partial).toBe(false);
  expect(complete).toHaveBeenCalledTimes(6);
});

it("the overall module's prompt includes prior module bodies", async () => {
  const complete = vi.fn().mockResolvedValue('A clean reading body.');
  const deps: ReadingDeps = { llm: { complete } as LlmClient };

  await generateReading(input, deps);

  const overallCall = complete.mock.calls[complete.mock.calls.length - 1]?.[0] as string;
  expect(overallCall).toContain('Prior module output');
});

it('a module that keeps failing is reported ok:false and the rest partially recover', async () => {
  // Module identity is now carried in the system block (static prefix) — identify by title.
  const complete = vi
    .fn()
    .mockImplementation((_prompt: string, options?: { system?: Array<{ text: string }> }) => {
      const sys = (options?.system ?? []).map((b) => b.text).join('\n');
      if (sys.includes('Your Day Master')) return Promise.reject(new Error('429'));
      return Promise.resolve('A clean reading body.');
    });
  const deps: ReadingDeps = { llm: { complete } as LlmClient };

  const r = await generateReading(input, deps);

  const ilgan = r.modules.find((m) => m.module === 'ilgan');
  expect(ilgan?.ok).toBe(false);
  expect(ilgan?.error).toBeDefined();
  expect(r.partial).toBe(true);
  expect(r.modules.filter((m) => m.ok)).toHaveLength(5);
});

it('every LLM call carries caching system blocks (last block has cache_control)', async () => {
  const complete = vi.fn().mockResolvedValue('A clean reading body.');
  const deps: ReadingDeps = { llm: { complete } as LlmClient };

  await generateReading(input, deps);

  for (const call of complete.mock.calls) {
    const options = call[1] as { system?: Array<{ type: string; text: string; cache_control?: { type: string } }> };
    expect(options?.system).toBeDefined();
    const system = options.system!;
    expect(system.length).toBeGreaterThanOrEqual(2);
    // Block 1 = shared prefix (tone+frame) — module-specific text mixed in here would break the
    // cross-module cache hit.
    expect(system[0]!.text).toContain('playful best friend');
    expect(system[0]!.text).toContain('English only');
    expect(system[0]!.cache_control).toEqual({ type: 'ephemeral' });
    expect(system[system.length - 1]!.cache_control).toEqual({ type: 'ephemeral' });
    // The dynamic (user) prompt must not duplicate the static prefix.
    const prompt = call[0] as string;
    expect(prompt).not.toContain('playful best friend');
    expect(prompt).toContain('[Chart summary]');
  }
});

it('startReading returns per-module promises immediately, resolving to the same result as full', async () => {
  const complete = vi.fn().mockResolvedValue('A clean reading body.');
  const deps: ReadingDeps = { llm: { complete } as LlmClient };

  const started = startReading(input, deps);

  expect(started.modules).toHaveLength(6);
  expect(started.modules.map((m) => m.module)).toEqual([
    'ilgan', 'ilju', 'ohaeng', 'sipsin', 'sinsal', 'overall',
  ]);

  const first = await started.modules[0]!.promise;
  expect(first.ok).toBe(true);
  expect(first.body).toBe('A clean reading body.');

  const full = await started.full;
  expect(full.modules).toHaveLength(6);
  expect(full.partial).toBe(false);
  expect(complete).toHaveBeenCalledTimes(6);
});

it('startReading resolves a failing module to ok:false without rejecting its own promise', async () => {
  const complete = vi
    .fn()
    .mockImplementation((_prompt: string, options?: { system?: Array<{ text: string }> }) => {
      const sys = (options?.system ?? []).map((b) => b.text).join('\n');
      if (sys.includes('Your Day Master')) return Promise.reject(new Error('429'));
      return Promise.resolve('A clean reading body.');
    });
  const deps: ReadingDeps = { llm: { complete } as LlmClient };

  const started = startReading(input, deps);
  const ilgan = await started.modules[0]!.promise;
  expect(ilgan.ok).toBe(false);

  const full = await started.full;
  expect(full.partial).toBe(true);
});

it('a hasCjkLeak or hasRawLeak violation retries and eventually reports failure', async () => {
  const complete = vi.fn().mockResolvedValue('This chart shows a breakdown of 0.91 confidence.');
  const deps: ReadingDeps = { llm: { complete } as LlmClient, moduleRetries: 1 };

  const r = await generateReading(input, deps);

  expect(r.partial).toBe(true);
  expect(r.modules.every((m) => !m.ok)).toBe(true);
});
