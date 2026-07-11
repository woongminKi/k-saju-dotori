import { describe, it, expect } from 'vitest';
import { runLoveMarriage } from '../love-marriage';
import { fakeChart, mockLlm } from './_fixtures';

describe('menus/love-marriage', () => {
  it('연애·결혼 단일 섹션을 만든다(unlocked)', async () => {
    const llm = mockLlm(() => 'Your luck pillars point to a bond growing stronger over time.');
    const r = await runLoveMarriage(
      { menu: 'love-marriage', subject: { chart: fakeChart(), chartSummary: '일주 戊午' } },
      { llm, unlocked: true },
    );
    expect(r.menu).toBe('love-marriage');
    expect(r.sections).toHaveLength(1);
    expect(r.sections[0]!.id).toBe('love-marriage');
    expect(r.sections[0]!.body).toBe('Your luck pillars point to a bond growing stronger over time.');
    expect(r.partial).toBe(false);
  });
});
