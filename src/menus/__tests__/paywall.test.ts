import { describe, it, expect } from 'vitest';
import { applyPaywall } from '../paywall';
import type { MenuResult } from '../types';

function baseResult(): MenuResult {
  return {
    menu: 'solo',
    sections: [{ id: 's1', title: '제목', body: '유료 본문임', ok: true }],
    teaser: '맛보기임',
    locked: false,
    promptVersion: 'v',
    partial: false,
  };
}

describe('menus/paywall', () => {
  it('unlocked=true 면 본문 유지, locked=false', () => {
    const r = applyPaywall(baseResult(), true);
    expect(r.sections[0]!.body).toBe('유료 본문임');
    expect(r.locked).toBe(false);
  });

  it('unlocked=false 면 본문 가리고 제목/ok 유지, locked=true', () => {
    const r = applyPaywall(baseResult(), false);
    expect(r.sections[0]!.body).toBe('');
    expect(r.sections[0]!.title).toBe('제목');
    expect(r.sections[0]!.ok).toBe(true);
    expect(r.locked).toBe(true);
    expect(r.teaser).toBe('맛보기임'); // 티저는 항상 노출
  });

  it('원본을 변형하지 않는다(불변)', () => {
    const original = baseResult();
    applyPaywall(original, false);
    expect(original.sections[0]!.body).toBe('유료 본문임');
  });
});
