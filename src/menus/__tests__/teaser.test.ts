import { describe, it, expect } from 'vitest';
import { buildTeaser } from '../teaser';
import type { MenuSection } from '../types';

describe('menus/teaser', () => {
  it('첫 ok 섹션 앞부분을 잘라 미리보기로 만든다', () => {
    const long = '가'.repeat(200);
    const sections: MenuSection[] = [{ id: 's1', title: 't', body: long, ok: true }];
    const teaser = buildTeaser(sections);
    expect(teaser.length).toBeLessThanOrEqual(123); // 120자 + '...'
    expect(teaser.endsWith('...')).toBe(true);
  });

  it('짧은 본문은 자르지 않는다', () => {
    const sections: MenuSection[] = [{ id: 's1', title: 't', body: '짧은 본문임', ok: true }];
    expect(buildTeaser(sections)).toBe('짧은 본문임');
  });

  it('ok 섹션이 없으면 안내 문구', () => {
    const sections: MenuSection[] = [{ id: 's1', title: 't', body: '', ok: false }];
    expect(buildTeaser(sections)).toBe('풀이를 준비 중임. 잠시 후 다시 시도해줘.');
  });
});
