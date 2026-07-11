import type { FullSajuChart } from '../saju-engine';
import type { LlmClient } from '../llm';

export type ReadingModuleId =
  | 'ilgan'        // 일간 본질
  | 'ilju'         // 일주 분석
  | 'ohaeng'       // 오행 균형
  | 'sipsin'       // 십신 구조
  | 'twelveStates' // 12운성 강약
  | 'sinsal'       // 주요 신살
  | 'hapchung'     // 합충형해
  | 'overall';     // 종합

export const READING_MODULE_IDS: ReadingModuleId[] = [
  'ilgan', 'ilju', 'ohaeng', 'sipsin', 'twelveStates', 'sinsal', 'hapchung', 'overall',
];

export interface ModuleReading {
  module: ReadingModuleId;
  title: string;
  /** 음슴체 풀이 본문(sanitize·guard 통과분). 실패 시 ''. */
  body: string;
  ok: boolean;
  /** 실패 시 사유. */
  error?: string;
}

export interface FullReading {
  modules: ModuleReading[];
  promptVersion: string;
  /** 모듈 중 하나라도 실패하면 true. */
  partial: boolean;
}

export interface ReadingInput {
  chart: FullSajuChart;
  /** 선택 — 사람 친화 요약을 외부에서 주면 그대로 쓰고, 없으면 chart-summary 로 생성. */
  chartSummary?: string;
}

export interface ReadingDeps {
  llm: LlmClient;
  /** 모듈별 재시도 횟수(기본 2). */
  moduleRetries?: number;
}
