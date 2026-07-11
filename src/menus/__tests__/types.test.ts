import { describe, it, expect } from 'vitest';
import { MENU_IDS } from '../types';
import type { MenuInput, MenuResult, MenuDeps } from '../types';
import { fakeChart, mockLlm } from './_fixtures';

describe('menus/types', () => {
  it('MENU_IDS 는 MVP 8메뉴', () => {
    expect(MENU_IDS).toEqual([
      'solo',
      'couple',
      'love-marriage',
      'naming',
      'career',
      'newyear',
      'reunion',
      'intimacy',
    ]);
  });

  it('MenuInput 판별 유니온이 메뉴별로 구성된다', () => {
    const solo: MenuInput = { menu: 'solo', subject: { chart: fakeChart() } };
    const couple: MenuInput = {
      menu: 'couple',
      person: { chart: fakeChart() },
      partner: { chart: fakeChart() },
    };
    expect(solo.menu).toBe('solo');
    expect(couple.menu).toBe('couple');
  });

  it('MenuDeps 는 llm 을 요구하고 naming/unlocked 는 선택', () => {
    const deps: MenuDeps = { llm: mockLlm(() => '본문임') };
    expect(typeof deps.llm.complete).toBe('function');
  });

  it('MenuResult 형태', () => {
    const r: MenuResult = {
      menu: 'solo',
      sections: [{ id: 's1', title: '제목', body: '본문임', ok: true }],
      teaser: '맛보기임',
      locked: false,
      promptVersion: 'v',
      partial: false,
    };
    expect(r.sections).toHaveLength(1);
  });
});
