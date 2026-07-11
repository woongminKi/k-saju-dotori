// anthropic-client 테스트 — SDK mock 주입(`client` 옵션)으로 실제 API 호출 없이 검증.
//   - 생성자 키 처리(키 없음 / apiKey 주입 / client 주입)
//   - complete() 정상/에러/재시도 분기(5xx·429 재시도, 4xx 즉시 throw, 네트워크 에러 재시도)
//   - 옵션(model / maxTokens / retries) 와 prompt → messages 변환
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnthropicLlmClient, type AnthropicLike } from '../anthropic-client';

// ── 헬퍼: messages.create mock 가진 minimal SDK 객체 ─────────────────────────
type CreateFn = ReturnType<typeof vi.fn>;
function makeMockClient(create: CreateFn): AnthropicLike {
  // vi.fn() 은 generic Procedure 라 SDK 의 정밀한 overload 시그니처와 호환 안 됨 — unknown 경유 캐스팅.
  return { messages: { create: create as unknown as AnthropicLike['messages']['create'] } };
}

function textResponse(
  text: string,
  stopReason?: string,
): { content: Array<{ type: 'text'; text: string }>; stop_reason?: string } {
  return { content: [{ type: 'text', text }], stop_reason: stopReason };
}

// SDK APIError shape (duck-type — status 숫자 보유).
class FakeApiError extends Error {
  status: number;
  constructor(status: number, message = `status ${status}`) {
    super(message);
    this.status = status;
  }
}

// 백오프 wait 를 즉시 통과시키기 위해 fake timers 사용.
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete process.env['ANTHROPIC_API_KEY'];
});

describe('AnthropicLlmClient — 생성자', () => {
  it('키도 client 도 없으면 명확한 한국어 에러로 throw 한다 (.env / 콘솔 URL 언급)', () => {
    delete process.env['ANTHROPIC_API_KEY'];
    expect(() => new AnthropicLlmClient()).toThrowError(/ANTHROPIC_API_KEY/);
    // 메시지에 .env 와 콘솔 URL 이 포함되어야 함.
    try {
      new AnthropicLlmClient();
      throw new Error('생성자가 throw 하지 않음');
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain('.env');
      expect(msg).toContain('console.anthropic.com');
    }
  });

  it('apiKey 를 직접 주입하면 정상 생성된다 (실제 호출 없음)', () => {
    expect(() => new AnthropicLlmClient({ apiKey: 'sk-test-key' })).not.toThrow();
  });

  it('client 를 주입하면 apiKey 없이도 정상 생성된다 (테스트 모드)', () => {
    const mock = makeMockClient(vi.fn());
    delete process.env['ANTHROPIC_API_KEY'];
    expect(() => new AnthropicLlmClient({ client: mock })).not.toThrow();
  });

  it('환경변수 ANTHROPIC_API_KEY 가 있으면 정상 생성된다', () => {
    process.env['ANTHROPIC_API_KEY'] = 'sk-from-env';
    expect(() => new AnthropicLlmClient()).not.toThrow();
  });
});

describe('AnthropicLlmClient — complete() happy path', () => {
  it('text 블록을 그대로 반환한다', async () => {
    const create = vi.fn().mockResolvedValue(textResponse('결과 텍스트'));
    const client = new AnthropicLlmClient({ client: makeMockClient(create) });
    const result = await client.complete('hello');
    expect(result).toBe('결과 텍스트');
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('prompt 는 user role 단일 메시지로 변환된다', async () => {
    const create = vi.fn().mockResolvedValue(textResponse('ok'));
    const client = new AnthropicLlmClient({ client: makeMockClient(create) });
    await client.complete('나의 프롬프트');
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: 'user', content: '나의 프롬프트' }],
      }),
    );
  });

  it('기본 model / max_tokens 가 호출 파라미터에 들어간다', async () => {
    const create = vi.fn().mockResolvedValue(textResponse('ok'));
    const client = new AnthropicLlmClient({ client: makeMockClient(create) });
    await client.complete('x');
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
      }),
    );
  });
});

describe('AnthropicLlmClient — 응답 이상 처리', () => {
  it('content 에 text 블록이 없으면 명확한 에러로 throw (재시도 후)', async () => {
    // text 블록 없음은 status 없는 Error → 네트워크 에러로 간주되어 재시도까지 거친 뒤 throw.
    const create = vi.fn().mockResolvedValue({ content: [{ type: 'tool_use' }] });
    const client = new AnthropicLlmClient({ client: makeMockClient(create) });
    const p = client.complete('x');
    const caught = p.catch((e) => e);
    await vi.runAllTimersAsync();
    const err = (await caught) as Error;
    expect(err.message).toMatch(/응답에 text 블록이 없습니다/);
  });

  it('content 가 빈 배열이어도 명확한 에러로 throw (재시도 후)', async () => {
    const create = vi.fn().mockResolvedValue({ content: [] });
    const client = new AnthropicLlmClient({ client: makeMockClient(create) });
    const p = client.complete('x');
    const caught = p.catch((e) => e);
    await vi.runAllTimersAsync();
    const err = (await caught) as Error;
    expect(err.message).toMatch(/응답에 text 블록이 없습니다/);
  });
});

describe('AnthropicLlmClient — 재시도 동작', () => {
  it('5xx 두 번 실패 후 세 번째에 성공하면 결과 반환 (호출 3회)', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(new FakeApiError(503))
      .mockRejectedValueOnce(new FakeApiError(502))
      .mockResolvedValueOnce(textResponse('드디어'));
    const client = new AnthropicLlmClient({ client: makeMockClient(create) });
    const p = client.complete('x');
    // 백오프 타이머 진행.
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result).toBe('드디어');
    expect(create).toHaveBeenCalledTimes(3);
  });

  it('429 rate-limit 은 즉시 throw 가 아니라 재시도된다', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(new FakeApiError(429))
      .mockResolvedValueOnce(textResponse('ok'));
    const client = new AnthropicLlmClient({ client: makeMockClient(create) });
    const p = client.complete('x');
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result).toBe('ok');
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('4xx (400) 는 재시도 없이 즉시 throw — 호출 1회만', async () => {
    const err = new FakeApiError(400, 'bad request');
    const create = vi.fn().mockRejectedValue(err);
    const client = new AnthropicLlmClient({ client: makeMockClient(create) });
    await expect(client.complete('x')).rejects.toBe(err);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('네트워크 에러(status 없는 Error)는 재시도한다 — 3회 시도', async () => {
    const create = vi.fn().mockRejectedValue(new Error('ECONNRESET'));
    const client = new AnthropicLlmClient({ client: makeMockClient(create) });
    const p = client.complete('x');
    // 모든 거절을 await 로 받으려면 catch 부착.
    const caught = p.catch((e) => e);
    await vi.runAllTimersAsync();
    const err = (await caught) as Error;
    expect(err.message).toBe('ECONNRESET');
    expect(create).toHaveBeenCalledTimes(3);
  });

  it('재시도 소진 시 마지막 SDK 에러가 그대로 throw 된다', async () => {
    const last = new FakeApiError(503, 'final');
    const create = vi
      .fn()
      .mockRejectedValueOnce(new FakeApiError(503, 'first'))
      .mockRejectedValueOnce(new FakeApiError(503, 'second'))
      .mockRejectedValueOnce(last);
    const client = new AnthropicLlmClient({ client: makeMockClient(create) });
    const p = client.complete('x');
    const caught = p.catch((e) => e);
    await vi.runAllTimersAsync();
    const err = await caught;
    expect(err).toBe(last);
    expect(create).toHaveBeenCalledTimes(3);
  });
});

describe('AnthropicLlmClient — system / prompt caching', () => {
  it('options.system 블록 배열이 cache_control 포함 그대로 SDK 에 전달된다', async () => {
    const create = vi.fn().mockResolvedValue(textResponse('ok'));
    const client = new AnthropicLlmClient({ client: makeMockClient(create) });
    const system = [
      { type: 'text' as const, text: '공유 프리픽스', cache_control: { type: 'ephemeral' as const } },
      { type: 'text' as const, text: '모듈 규칙', cache_control: { type: 'ephemeral' as const } },
    ];
    await client.complete('동적 프롬프트', { system });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        system: [
          { type: 'text', text: '공유 프리픽스', cache_control: { type: 'ephemeral' } },
          { type: 'text', text: '모듈 규칙', cache_control: { type: 'ephemeral' } },
        ],
        messages: [{ role: 'user', content: '동적 프롬프트' }],
      }),
    );
  });

  it('options.system 문자열도 전달된다', async () => {
    const create = vi.fn().mockResolvedValue(textResponse('ok'));
    const client = new AnthropicLlmClient({ client: makeMockClient(create) });
    await client.complete('x', { system: '시스템 문자열' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ system: '시스템 문자열' }));
  });

  it('system 미지정이면 (하위 호환) system 필드 자체를 보내지 않는다', async () => {
    const create = vi.fn().mockResolvedValue(textResponse('ok'));
    const client = new AnthropicLlmClient({ client: makeMockClient(create) });
    await client.complete('x');
    const params = create.mock.calls[0]?.[0] as Record<string, unknown>;
    expect('system' in params).toBe(false);
  });
});

describe('AnthropicLlmClient — 옵션 커스터마이즈', () => {
  it('model / maxTokens 옵션이 SDK 호출에 반영된다', async () => {
    const create = vi.fn().mockResolvedValue(textResponse('ok'));
    const client = new AnthropicLlmClient({
      client: makeMockClient(create),
      model: 'foo',
      maxTokens: 512,
    });
    await client.complete('x');
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'foo', max_tokens: 512 }),
    );
  });

  it('retries 옵션이 재시도 횟수를 결정한다 — 5 회 시도 후 throw', async () => {
    const create = vi.fn().mockRejectedValue(new FakeApiError(503));
    const client = new AnthropicLlmClient({
      client: makeMockClient(create),
      retries: 5,
    });
    const p = client.complete('x');
    const caught = p.catch((e) => e);
    await vi.runAllTimersAsync();
    await caught;
    expect(create).toHaveBeenCalledTimes(5);
  });
});

describe('AnthropicLlmClient — max_tokens 잘림 처리', () => {
  it('stop_reason 이 max_tokens 가 아니면 재시도 없이 그대로 반환한다', async () => {
    const create = vi.fn().mockResolvedValue(textResponse('정상 종료', 'end_turn'));
    const client = new AnthropicLlmClient({ client: makeMockClient(create) });
    const result = await client.complete('x');
    expect(result).toBe('정상 종료');
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('max_tokens 감지 시 max_tokens 를 1024 늘려 1회 재시도하고, 재시도가 정상 종료면 그 결과를 반환한다', async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce(textResponse('잘린 문장 중간에', 'max_tokens'))
      .mockResolvedValueOnce(textResponse('완결된 문장입니다.', 'end_turn'));
    const client = new AnthropicLlmClient({ client: makeMockClient(create) });
    const result = await client.complete('x');
    expect(result).toBe('완결된 문장입니다.');
    expect(create).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenNthCalledWith(1, expect.objectContaining({ max_tokens: 2048 }));
    expect(create).toHaveBeenNthCalledWith(2, expect.objectContaining({ max_tokens: 3072 }));
  });

  it('재시도도 max_tokens 로 잘리면 마지막 완결 문장까지 트림해 반환하고 [READING_TRUNCATED] 를 로그한다', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const create = vi
      .fn()
      .mockResolvedValueOnce(textResponse('1차: 문장 하나. 잘린 부분', 'max_tokens'))
      .mockResolvedValueOnce(textResponse('완결된 문장. 그리고 또 완결. 여기서 잘림', 'max_tokens'));
    const client = new AnthropicLlmClient({ client: makeMockClient(create) });
    const result = await client.complete('x');
    expect(result).toBe('완결된 문장. 그리고 또 완결.');
    expect(create).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('[READING_TRUNCATED]'));
    errorSpy.mockRestore();
  });

  it('트림 대상에 문장 종결 부호가 전혀 없으면 원문을 그대로 반환한다(트림할 경계가 없음)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const create = vi
      .fn()
      .mockResolvedValueOnce(textResponse('1차 잘림', 'max_tokens'))
      .mockResolvedValueOnce(textResponse('종결부호 없이 계속 잘리는 문장', 'max_tokens'));
    const client = new AnthropicLlmClient({ client: makeMockClient(create) });
    const result = await client.complete('x');
    expect(result).toBe('종결부호 없이 계속 잘리는 문장');
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('문장 종결부호보다 뒤에 개행이 있으면 개행 경계를 우선해 마지막 완결 줄까지만 남긴다', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const create = vi
      .fn()
      .mockResolvedValueOnce(textResponse('1차 잘림', 'max_tokens'))
      .mockResolvedValueOnce(
        textResponse('완결된 문장.\n둘째 줄도 완결.\n셋째 줄은 잘린 부분 중간에', 'max_tokens'),
      );
    const client = new AnthropicLlmClient({ client: makeMockClient(create) });
    const result = await client.complete('x');
    expect(result).toBe('완결된 문장.\n둘째 줄도 완결.');
    errorSpy.mockRestore();
  });

  it('마크다운 불릿 리스트가 잘렸을 때 완결된 마지막 항목까지 통째로 보존한다', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const create = vi
      .fn()
      .mockResolvedValueOnce(textResponse('1차 잘림', 'max_tokens'))
      .mockResolvedValueOnce(
        textResponse(
          '완결된 도입 문장.\n- 리스트 항목 하나\n- 리스트 항목 둘\n- 잘린 리스트 항목 중간에',
          'max_tokens',
        ),
      );
    const client = new AnthropicLlmClient({ client: makeMockClient(create) });
    const result = await client.complete('x');
    expect(result).toBe('완결된 도입 문장.\n- 리스트 항목 하나\n- 리스트 항목 둘');
    errorSpy.mockRestore();
  });

  it('소수점("8.5")의 "." 은 문장 경계로 오인되지 않는다 — 트림 없이 원문을 그대로 반환한다', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const truncated = '측정값은 8.5퍼센트였으며 계속해서 잘리는 부분';
    const create = vi
      .fn()
      .mockResolvedValueOnce(textResponse('1차 잘림', 'max_tokens'))
      .mockResolvedValueOnce(textResponse(truncated, 'max_tokens'));
    const client = new AnthropicLlmClient({ client: makeMockClient(create) });
    const result = await client.complete('x');
    // "8.5" 의 "." 뒤는 공백이 아니라 숫자 "5" 이므로 경계로 인정하지 않고, 다른 경계도 없어 원문 그대로.
    expect(result).toBe(truncated);
    errorSpy.mockRestore();
  });

  it('5xx 에러 재시도 카운터와 max_tokens 재시도는 서로 독립적이다 — 에러 재시도 후 max_tokens 도 감지', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(new FakeApiError(503))
      .mockResolvedValueOnce(textResponse('잘림', 'max_tokens'))
      .mockResolvedValueOnce(textResponse('정상 완결.', 'end_turn'));
    const client = new AnthropicLlmClient({ client: makeMockClient(create) });
    const p = client.complete('x');
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result).toBe('정상 완결.');
    expect(create).toHaveBeenCalledTimes(3);
  });
});
