// LLM 클라이언트 인터페이스 — interpret-layer(해석 레이어)가 의존하는 유일한 LLM 경계.
//   구현체(실제 API 호출·재시도·타임아웃)는 엔진 외부에서 주입한다(orchestrator deps).
//   타임아웃·API 에러는 여기서 삼키지 않고 호출자에게 reject 로 전파 — interpret-layer 도 전파하고,
//   orchestrator(M1-T7)가 결정론적 해설로 폴백 + flags.humanReviewNeeded 를 세운다.
export interface LlmClient {
  /** 프롬프트 한 개를 받아 모델의 텍스트 응답을 반환. 실패 시 reject. */
  complete(prompt: string, options?: LlmCompletionOptions): Promise<string>;
}

/** 선택적 호출 옵션 — 구현체가 무시해도 무방. interpret-layer 는 현재 사용 안 함(시그니처 호환만). */
export interface LlmCompletionOptions {
  /** 응답 최대 토큰 수 힌트. */
  maxTokens?: number;
  /** 0~1, 낮을수록 결정론적. */
  temperature?: number;
  /**
   * system 프롬프트. 블록 배열로 주면 cache_control 마커로 Anthropic prompt caching 을
   * 활용할 수 있다(정적 프리픽스 캐싱 — 입력 토큰 비용 절감). 미지정 시 기존과 동일하게
   * user 메시지 하나만 전송.
   */
  system?: LlmSystem;
}

/** system 프롬프트 — 단일 문자열 또는 캐싱 마커를 나를 수 있는 블록 배열. */
export type LlmSystem = string | ReadonlyArray<LlmSystemBlock>;

export interface LlmSystemBlock {
  type: 'text';
  text: string;
  /** 이 블록까지의 프리픽스를 캐시하라는 마커 (Anthropic prompt caching, TTL 5분). */
  cache_control?: { type: 'ephemeral' };
}
