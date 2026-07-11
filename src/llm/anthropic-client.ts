// anthropic-client — LlmClient 구현체 (Anthropic Claude API).
//   - ANTHROPIC_API_KEY 환경변수에서 키 로드(미설정 → 명확한 에러).
//   - 기본 모델 = claude-sonnet-4-6 (recent, fast, 작명 해석 품질 충분).
//   - 재시도: 5xx / rate-limit(429) / network 에러 → 3회 (백오프 0.5/1/2 s). 4xx → 즉시 throw.
//   - 토큰 한도: max_tokens 2048 (검증/생성 출력은 JSON 단답 + 짧은 텍스트라 충분).
//   - 출력은 첫 번째 text 블록 (model 이 코드블록이나 ```json fence 를 붙여도 호출측 unwrapJsonFence 가 처리).
//   - stop_reason === 'max_tokens' (응답이 한도에 걸려 중간에 잘림) 감지 시 max_tokens 를 1024 늘려
//     1회 재시도. 재시도해도 또 잘리면 마지막 완결 문장까지 트림해 반환 + [READING_TRUNCATED] 로그
//     (잘린 문장이 무음으로 노출되는 것을 방지). reading/menus 등 모든 호출자가 이 클라이언트 하나를
//     경유하므로 여기 한 곳만 고치면 전체 커버된다.
//
// LlmCompletionOptions 중 system 만 지원 — 블록 배열이면 cache_control 마커를 그대로 SDK 에
// 전달해 Anthropic prompt caching 을 활성화한다(정적 프리픽스 입력 토큰 -90%). maxTokens /
// temperature 는 여전히 의도적으로 무시(구성은 생성자 옵션으로 통일). 필요해지면 그때 위임.
//
// 의존성: @anthropic-ai/sdk 공식 SDK.

import Anthropic from '@anthropic-ai/sdk';
import type { LlmClient, LlmCompletionOptions } from '../naming-engine/llm';

// ── 구조적 SDK 타입 ────────────────────────────────────────────────────────
// 테스트에서 minimal mock 주입을 허용하기 위해 messages.create 만 요구하는 구조적 타입.
// 실제 Anthropic SDK 의 `messages` 는 batches/parse/stream/countTokens/_client 까지 들고 있어
// `Pick<Anthropic, 'messages'>` 로는 mock 이 호환되지 않음 → 사용하는 표면만 명시.
type MessagesCreateFn = Anthropic['messages']['create'];
export interface MessagesShape {
  create: MessagesCreateFn;
}
export interface AnthropicLike {
  messages: MessagesShape;
}

// ── 옵션 ────────────────────────────────────────────────────────────────────
export interface AnthropicLlmClientOptions {
  /** ANTHROPIC_API_KEY 미설정 시 생성자에서 throw. 직접 주입(테스트용) 가능. */
  apiKey?: string;
  /** 기본 'claude-sonnet-4-6'. */
  model?: string;
  /** 기본 2048. */
  maxTokens?: number;
  /** 재시도 횟수. 기본 3. (1 회 시도 + 2 회 재시도 = 총 3 회 호출) */
  retries?: number;
  /** SDK 클라이언트 주입(테스트 — mock SDK). messages.create 만 있으면 됨. */
  client?: AnthropicLike;
}

// ── 구현 ────────────────────────────────────────────────────────────────────
export class AnthropicLlmClient implements LlmClient {
  private readonly client: AnthropicLike;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly retries: number;

  constructor(opts: AnthropicLlmClientOptions = {}) {
    const apiKey = opts.apiKey ?? process.env['ANTHROPIC_API_KEY'];
    if (!opts.client && !apiKey) {
      throw new Error(
        'AnthropicLlmClient: ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다. ' +
          '`.env` 파일이나 셸 환경에 키를 추가하세요. ' +
          '(https://console.anthropic.com/settings/keys 에서 발급)',
      );
    }
    this.client = opts.client ?? new Anthropic({ apiKey: apiKey! });
    this.model = opts.model ?? 'claude-sonnet-4-6';
    this.maxTokens = opts.maxTokens ?? 2048;
    this.retries = Math.max(1, opts.retries ?? 3);
  }

  async complete(prompt: string, options?: LlmCompletionOptions): Promise<string> {
    // Anthropic Messages API — options.system 이 있으면 system 파라미터로 전달(캐싱 마커 포함),
    // 없으면 기존처럼 user role 하나로 호출(프롬프트가 자체 자기충족적).
    const system = options?.system;
    let lastErr: unknown;
    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        const response = await this.createMessage(prompt, system, this.maxTokens);
        const text = extractText(response);
        if (response.stop_reason !== 'max_tokens') {
          return text;
        }
        // 잘림 감지 — max_tokens 상향 1회 재시도 (이 재시도는 5xx/429 재시도 카운터와 무관).
        const bumpedMaxTokens = this.maxTokens + 1024;
        const retryResponse = await this.createMessage(prompt, system, bumpedMaxTokens);
        const retryText = extractText(retryResponse);
        if (retryResponse.stop_reason !== 'max_tokens') {
          return retryText;
        }
        // 재시도도 잘림 — 마지막 완결 문장까지 트림해 무음 노출 방지 + 로그 마커.
        const trimmed = trimToSentenceBoundary(retryText);
        console.error(
          `[READING_TRUNCATED] max_tokens=${bumpedMaxTokens} 도달, 문장 경계로 트림 ` +
            `(원본 ${retryText.length}자 → ${trimmed.length}자)`,
        );
        return trimmed;
      } catch (err) {
        lastErr = err;
        // 4xx 류는 재시도 안 함 — bad request 는 prompt 가 문제라 재시도해도 같은 결과.
        // 단 429(rate-limit) 은 재시도 대상. SDK 의 APIError 는 .status 를 가짐.
        if (isApiError(err) && err.status >= 400 && err.status < 500 && err.status !== 429) {
          throw err;
        }
        if (attempt < this.retries) {
          // 지수 백오프 — 0.5 / 1 / 2 s (재시도 1 → 0.5s, 2 → 1s, 3 → 2s).
          const backoffMs = Math.pow(2, attempt - 1) * 500;
          await new Promise<void>((res) => setTimeout(res, backoffMs));
          continue;
        }
      }
    }
    throw lastErr instanceof Error
      ? lastErr
      : new Error(`AnthropicLlmClient: 재시도 ${this.retries}회 후 실패`);
  }

  /** messages.create 호출 1회 — maxTokens 를 상황별로 다르게 줄 수 있도록 파라미터화. */
  private createMessage(
    prompt: string,
    system: LlmCompletionOptions['system'],
    maxTokens: number,
  ) {
    return this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      ...(system !== undefined
        ? { system: typeof system === 'string' ? system : [...system] }
        : {}),
      messages: [{ role: 'user', content: prompt }],
    });
  }
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
/** messages.create 응답 중 이 모듈이 실제로 쓰는 표면만 — 첫 text 블록 추출용. */
interface MessageResponseLike {
  content: ReadonlyArray<{ type: string; text?: string }>;
}

/** 첫 번째 text 블록을 추출. 없으면 throw(호출측 재시도 루프가 처리). */
function extractText(response: MessageResponseLike): string {
  const block = response.content.find((b) => b.type === 'text');
  if (!block || typeof block.text !== 'string') {
    throw new Error('AnthropicLlmClient: 응답에 text 블록이 없습니다.');
  }
  return block.text;
}

// 종결부호 뒤에 공백/개행이 오는 경우만 문장 경계로 인정 — "8.5" 같은 소수점 중간의 "." 는
// 뒤에 숫자가 오므로 제외된다(followed-by-whitespace 가드).
const SENTENCE_END_RE = /[.!?](?=\s)/g;

/** 마지막 문장 종결 경계(다음 글자 포함 index, 없으면 -1). */
function lastSentenceEndIndex(text: string): number {
  let lastIdx = -1;
  for (const m of text.matchAll(SENTENCE_END_RE)) {
    if (m.index !== undefined) lastIdx = m.index;
  }
  return lastIdx;
}

/**
 * 텍스트를 마지막 완결 경계까지 트림.
 *   - 마지막 문장 종결부호(. ! ?)를 찾되, 그보다 뒤에 개행이 있으면 개행 경계를 우선한다
 *     (마크다운 리스트/헤딩처럼 문장부호 없이 끝나는 마지막 완결 줄을 통째로 보존).
 *   - 둘 다 없으면(트림할 경계가 없음) 원본 그대로 반환.
 */
function trimToSentenceBoundary(text: string): string {
  const lastPunctIdx = lastSentenceEndIndex(text);
  const lastNewlineIdx = text.lastIndexOf('\n');
  if (lastNewlineIdx > lastPunctIdx) {
    const trimmed = text.slice(0, lastNewlineIdx).trimEnd();
    return trimmed || text;
  }
  if (lastPunctIdx !== -1) {
    return text.slice(0, lastPunctIdx + 1).trimEnd();
  }
  return text;
}

/** SDK APIError 타입 가드 — SDK 가 직접 export 안 해서 duck-type. */
function isApiError(err: unknown): err is { status: number; message: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof (err as { status: unknown }).status === 'number'
  );
}
