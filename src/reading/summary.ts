// 무료 홈(/result) 티저 요약 생성 — 차트 요약으로 단일 LLM 콜을 돌려 짧은 티저 텍스트를 만든다.
//   generateReading(6모듈 유료 전체)과 완전히 분리된 저가 경로. 실패는 재시도 후 throw(무료라 차감 없음).

import type { ReadingInput, ReadingDeps } from './types';
import { buildChartSummaryEn } from './chart-summary-en';
import { buildTeaserPrompt, TEASER_PROMPT_VERSION } from './prompts/teaser-en';
import { sanitizeBody, hasRawLeak } from './sanitize';
import { hasCjkLeak } from './sanitize-en';
import { checkContentSafety } from './guard';

export { TEASER_PROMPT_VERSION };

/**
 * 차트 요약(결정론 데이터)으로 짧은 티저 요약을 생성한다. LLM 1회 호출.
 * 빈 응답·원시데이터 누출·안전성 위반은 실패로 보고 재시도, 모두 실패하면 throw.
 */
export async function generateSummary(input: ReadingInput, deps: ReadingDeps): Promise<string> {
  const summary = input.chartSummary ?? buildChartSummaryEn(input.chart);
  const prompt = buildTeaserPrompt(summary);
  const retries = deps.moduleRetries ?? 2;
  let lastError = '';

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const raw = await deps.llm.complete(prompt);
      const body = sanitizeBody(raw ?? '');
      if (!body) throw new Error('빈 응답');
      if (hasRawLeak(body)) throw new Error('원시데이터 누출');
      if (hasCjkLeak(body)) throw new Error('hanja/Hangul leak in English output');
      const safety = checkContentSafety(body);
      if (!safety.safe) throw new Error(`안전성 위반: ${safety.reason}`);
      return body;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(`티저 요약 생성 실패: ${lastError}`);
}
