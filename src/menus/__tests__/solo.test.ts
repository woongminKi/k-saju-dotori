import { describe, it, expect } from 'vitest';
import { runSolo } from '../solo';
import { fakeChart, mockLlm } from './_fixtures';

describe('menus/solo', () => {
  it('6모듈 풀이를 섹션으로 변환하고 티저를 만든다(unlocked)', async () => {
    const llm = mockLlm(() => 'This person carries a steady, grounded energy.');
    const r = await runSolo(
      { menu: 'solo', subject: { chart: fakeChart(), chartSummary: '일주 戊午' } },
      { llm, unlocked: true },
    );
    expect(r.menu).toBe('solo');
    expect(r.sections).toHaveLength(6); // reading 6모듈(twelveStates·hapchung 제외)
    expect(r.sections[0]!.body).toBe('This person carries a steady, grounded energy.');
    expect(r.locked).toBe(false);
    expect(r.teaser.length).toBeGreaterThan(0);
    expect(r.partial).toBe(false);
  });

  it('기본(unlocked 미지정)은 잠금 — 본문 가림, 티저 유지', async () => {
    const llm = mockLlm(() => 'A steady, grounded energy.');
    const r = await runSolo(
      { menu: 'solo', subject: { chart: fakeChart(), chartSummary: '일주 戊午' } },
      { llm },
    );
    expect(r.locked).toBe(true);
    expect(r.sections.every((s) => s.body === '')).toBe(true);
    expect(r.teaser.length).toBeGreaterThan(0);
  });
});
