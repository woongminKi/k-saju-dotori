// English re-creation of the test dropped in Phase 0 (deviation #5) — the Korean-repo-derived
// version asserted the Korean default pair labels ('사람 1'/'사람 2') from the dropped
// menus/prompts.ts; menus/prompts-en.ts (Phase 2) uses 'Person 1'/'Person 2' instead. Same test
// intent, English labels.
import { describe, it, expect } from 'vitest';
import { runCouple } from '../couple';
import { fakeChart, mockLlm } from './_fixtures';

describe('menus/couple', () => {
  it('builds a single compatibility section from two chart summaries (unlocked)', async () => {
    const llm = mockLlm((prompt) => {
      expect(prompt).toContain('Person 1');
      expect(prompt).toContain('Person 2');
      return 'Your energies balance each other out nicely.';
    });
    const r = await runCouple(
      {
        menu: 'couple',
        person: { chart: fakeChart(), chartSummary: 'A: Day Pillar Yang Earth, Horse' },
        partner: { chart: fakeChart(), chartSummary: 'B: Day Pillar Yin Water, Pig' },
      },
      { llm, unlocked: true },
    );
    expect(r.menu).toBe('couple');
    expect(r.sections).toHaveLength(1);
    expect(r.sections[0]!.id).toBe('couple');
    expect(r.sections[0]!.body).toBe('Your energies balance each other out nicely.');
  });

  it('unlocked:false paywalls the body but keeps the teaser', async () => {
    const llm = mockLlm(() => 'Your energies balance each other out nicely.');
    const r = await runCouple(
      {
        menu: 'couple',
        person: { chart: fakeChart(), chartSummary: 'A: Day Pillar Yang Earth, Horse' },
        partner: { chart: fakeChart(), chartSummary: 'B: Day Pillar Yin Water, Pig' },
      },
      { llm },
    );
    expect(r.locked).toBe(true);
    expect(r.sections[0]!.body).toBe('');
    expect(r.teaser.length).toBeGreaterThan(0);
  });
});
