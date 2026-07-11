import { describe, it, expect } from 'vitest';
import { runCareer } from '../career';
import { fakeChart, mockLlm } from './_fixtures';

describe('menus/career', () => {
  it('직업·적성운 단일 섹션을 만든다(unlocked)', async () => {
    const llm = mockLlm(() => 'A strong Officer influence draws you toward structure and steady organizations.');
    const r = await runCareer(
      { menu: 'career', subject: { chart: fakeChart(), chartSummary: '일주 戊午' } },
      { llm, unlocked: true },
    );
    expect(r.menu).toBe('career');
    expect(r.sections).toHaveLength(1);
    expect(r.sections[0]!.id).toBe('career');
    expect(r.sections[0]!.body).toBe('A strong Officer influence draws you toward structure and steady organizations.');
    expect(r.teaser.length).toBeGreaterThan(0);
    expect(r.partial).toBe(false);
    expect(r.locked).toBe(false);
  });

  it('unlocked:false 면 페이월로 본문이 가려진다', async () => {
    const llm = mockLlm(() => 'A strong Officer influence.');
    const r = await runCareer(
      { menu: 'career', subject: { chart: fakeChart(), chartSummary: '일주 戊午' } },
      { llm },
    );
    expect(r.locked).toBe(true);
    expect(r.sections[0]!.body).toBe('');
    expect(r.teaser.length).toBeGreaterThan(0);
  });
});
