import type { MenuResult } from './types';

/** unlocked=false 면 섹션 본문을 가리고 locked=true. 티저·제목·ok 는 유지. 새 객체 반환(불변). */
export function applyPaywall(result: MenuResult, unlocked: boolean): MenuResult {
  if (unlocked) return { ...result, locked: false };
  return {
    ...result,
    locked: true,
    sections: result.sections.map((s) => ({ ...s, body: '' })),
  };
}
