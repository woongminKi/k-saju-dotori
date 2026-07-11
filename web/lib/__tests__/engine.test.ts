import { describe, it, expect, vi } from 'vitest';
import {
  buildChart,
  computeReading,
  computeSummary,
  computeSoloMenu,
  computeCareerMenu,
  computeLoveMarriageMenu,
  computeCoupleMenu,
  computeCompatScore,
} from '../engine';
import type { BirthFields } from '../birth-params';
import type { LlmClient } from '@engine/llm';

const mockLlm = (text: string): LlmClient => ({ complete: async () => text });
const fields: BirthFields = {
  year: 1990, month: 5, day: 15, hour: 14, minute: 30,
  gender: 'M', timeZone: 'America/New_York', longitude: -74.006,
};
const partnerFields: BirthFields = {
  year: 1992, month: 3, day: 20, hour: 9, minute: 0,
  gender: 'F', timeZone: 'Europe/London', longitude: -0.1276,
};

describe('engine', () => {
  it('buildChart produces a day stem', () => {
    const chart = buildChart(fields);
    expect(chart.dayStem).toBeTruthy();
  });

  it('buildChart works for a female subject (gender translated at the boundary)', () => {
    const chart = buildChart(partnerFields);
    expect(chart.dayStem).toBeTruthy();
  });

  it('computeReading returns 6 modules (mock LLM)', async () => {
    const reading = await computeReading(fields, {
      llm: mockLlm('This person carries a calm, steady grain.'),
      moduleRetries: 0,
    });
    expect(reading.modules.length).toBe(6);
  });

  it('computeSummary returns a teaser via a single LLM call (no full generation)', async () => {
    const complete = vi.fn(async () => 'You carry a steady, grounded energy that others lean on. The full reading shows much more.');
    const teaser = await computeSummary(fields, { llm: { complete }, moduleRetries: 0 });
    expect(teaser).toContain('grounded');
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('computeSoloMenu reflects the locked state', async () => {
    const locked = await computeSoloMenu(fields, { llm: mockLlm('A calm grain.'), moduleRetries: 0, unlocked: false });
    expect(locked.locked).toBe(true);
    const open = await computeSoloMenu(fields, { llm: mockLlm('A calm grain.'), moduleRetries: 0, unlocked: true });
    expect(open.locked).toBe(false);
  });

  it('computeCareerMenu returns a single career section', async () => {
    const r = await computeCareerMenu(fields, { llm: mockLlm('A grain with clear structure.'), moduleRetries: 0, unlocked: true });
    expect(r.menu).toBe('career');
    expect(r.sections).toHaveLength(1);
    expect(r.locked).toBe(false);
  });

  it('computeLoveMarriageMenu returns a single love/marriage section', async () => {
    const r = await computeLoveMarriageMenu(fields, { llm: mockLlm('A warm, receptive grain.'), moduleRetries: 0, unlocked: true });
    expect(r.menu).toBe('love-marriage');
    expect(r.sections).toHaveLength(1);
    expect(r.locked).toBe(false);
  });

  it('computeCoupleMenu returns a single compatibility section', async () => {
    const r = await computeCoupleMenu(fields, partnerFields, { llm: mockLlm('A complementary pairing.'), moduleRetries: 0, unlocked: true });
    expect(r.menu).toBe('couple');
    expect(r.sections).toHaveLength(1);
    expect(r.locked).toBe(false);
  });

  it('computeCompatScore is deterministic and needs no LLM', () => {
    const a = computeCompatScore(fields, partnerFields);
    const b = computeCompatScore(fields, partnerFields);
    expect(a.score).toBe(b.score);
    expect(typeof a.score).toBe('number');
  });
});
