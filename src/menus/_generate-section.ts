import { sanitizeBody, hasRawLeak, hasCjkLeak } from '../reading/sanitize';
import { checkContentSafety } from '../reading/guard';
import type { LlmSystem } from '../naming-engine/llm';
import type { MenuSection, MenuDeps } from './types';

/**
 * 프롬프트로 한 섹션을 생성한다. reading.generateModule 과 동일한 fail-closed 파이프라인:
 * complete → sanitizeBody → hasRawLeak → checkContentSafety. 빈값/누출/안전위반은 재시도, 모두 실패하면 ok:false.
 * system 블록을 주면 Anthropic prompt caching 경로(LlmCompletionOptions.system)로 전달한다.
 */
export async function generateSection(
  id: string,
  title: string,
  prompt: string,
  deps: MenuDeps,
  system?: LlmSystem,
): Promise<MenuSection> {
  const retries = deps.moduleRetries ?? 2;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const raw = await deps.llm.complete(prompt, system ? { system } : undefined);
      const body = sanitizeBody(raw ?? '');
      if (!body) throw new Error('빈 응답');
      if (hasRawLeak(body)) throw new Error('원시데이터 누출');
      if (hasCjkLeak(body)) throw new Error('hanja/Hangul leak in English output');
      const safety = checkContentSafety(body);
      if (!safety.safe) throw new Error(`안전성 위반: ${safety.reason}`);
      return { id, title, body, ok: true };
    } catch {
      // 재시도
    }
  }
  return { id, title, body: '', ok: false };
}
