// 도토리 뽑기 엔진 — 사주 차트 + 질문 → 짧은 한 마디 답 + 다정한 이유.
//   풀이(reading)와 달리 단발성 짧은 출력이라 LLM 호출 1회로 끝난다.

import type { FullSajuChart } from '../saju-engine';
import type { LlmClient } from '../llm';
import { buildChartSummaryEn } from '../reading/chart-summary-en';
import { ORACLE_PROMPT_VERSION, buildOraclePrompt } from './prompt-en';

export { ORACLE_CATEGORIES, findQuestion } from './questions-en';
export type { OracleCategory, OracleQuestion } from './questions-en';
export { ORACLE_PROMPT_VERSION } from './prompt-en';

export interface OracleDrawInput {
  chart: FullSajuChart;
  /** 사용자가 고른 질문 텍스트. */
  question: string;
}

export interface OracleDrawDeps {
  llm: LlmClient;
}

export interface OracleDraw {
  question: string;
  /** 도토리에 적힌 짧은 한 마디. */
  answer: string;
  /** 왜 그런지 다정한 1~2문장 설명. */
  reason: string;
  promptVersion: string;
}

/** LLM 응답에서 코드펜스를 벗기고 {answer, reason} JSON 을 파싱한다. */
function parseDraw(raw: string): { answer: string; reason: string } {
  let s = raw.trim();
  const fence = s.match(/^```(?:\w+)?\s*\n?([\s\S]*?)\n?```$/);
  if (fence && fence[1] !== undefined) s = fence[1].trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) s = s.slice(start, end + 1);
  const obj = JSON.parse(s) as { answer?: unknown; reason?: unknown };
  if (typeof obj.answer !== 'string' || typeof obj.reason !== 'string') {
    throw new Error('도토리 뽑기 응답 형식이 올바르지 않습니다.');
  }
  return { answer: obj.answer.trim(), reason: obj.reason.trim() };
}

export async function drawOracle(
  input: OracleDrawInput,
  deps: OracleDrawDeps,
): Promise<OracleDraw> {
  const summary = buildChartSummaryEn(input.chart);
  const prompt = buildOraclePrompt(summary, input.question);
  const raw = await deps.llm.complete(prompt);
  const { answer, reason } = parseDraw(raw);
  return { question: input.question, answer, reason, promptVersion: ORACLE_PROMPT_VERSION };
}
