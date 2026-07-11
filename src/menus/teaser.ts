import type { MenuSection } from './types';

const TEASER_MAX = 120;

/** 첫 ok 섹션 본문 앞 120자를 무료 미리보기로. ok 섹션 없으면 안내 문구. 결정적(LLM 미사용). */
export function buildTeaser(sections: MenuSection[]): string {
  const first = sections.find((s) => s.ok && s.body);
  if (!first) return '풀이를 준비 중임. 잠시 후 다시 시도해줘.';
  if (first.body.length <= TEASER_MAX) return first.body;
  return `${first.body.slice(0, TEASER_MAX)}...`;
}
