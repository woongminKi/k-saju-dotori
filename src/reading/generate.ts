import type { ModuleReading, ReadingModuleId, FullReading, ReadingInput, ReadingDeps } from './types';
import { buildChartSummaryEn } from './chart-summary-en';
import { buildModuleSystemBlocks, buildModuleUserPrompt, MODULE_SPECS } from './prompts/modules-en';
import { READING_PROMPT_VERSION } from './prompts/frame-en-v1';
import { sanitizeBody, hasRawLeak, hasCjkLeak } from './sanitize';
import { checkContentSafety } from './guard';

// twelveStates·hapchung 은 사용자 피드백으로 목록에서 제외(2026-07-10) — MODULE_SPECS/타입은
// 보존(되살릴 가능성 + diff 최소화), 이 배열에서만 뺀다. overall 은 이 배열을 그대로 입력으로 쓰므로
// 별도 조정 없이 자동으로 6모듈(5병렬+overall) 기준으로 동작한다.
const PARALLEL_MODULES: ReadingModuleId[] = [
  'ilgan', 'ilju', 'ohaeng', 'sipsin', 'sinsal',
];

/** 한 모듈을 생성한다. 빈 응답·누출·안전성 위반은 실패로 보고 재시도, 모두 실패하면 ok:false. */
async function generateModule(
  module: ReadingModuleId,
  chartSummary: string,
  priorBodies: string[] | undefined,
  deps: ReadingDeps,
): Promise<ModuleReading> {
  const retries = deps.moduleRetries ?? 2;
  // 정적(system, cache_control 캐싱) / 동적(user) 분리 — 8회 호출이 TONE+FRAME 프리픽스를 공유한다.
  const system = buildModuleSystemBlocks(module);
  const prompt = buildModuleUserPrompt(module, chartSummary, priorBodies);
  const title = MODULE_SPECS[module].title;
  let lastError = '';

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const raw = await deps.llm.complete(prompt, { system });
      const body = sanitizeBody(raw ?? '');
      if (!body) throw new Error('빈 응답');
      if (hasRawLeak(body)) throw new Error('원시데이터 누출');
      if (hasCjkLeak(body)) throw new Error('hanja/Hangul leak in English output');
      const safety = checkContentSafety(body);
      if (!safety.safe) throw new Error(`안전성 위반: ${safety.reason}`);
      return { module, title, body, ok: true };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  return { module, title, body: '', ok: false, error: lastError };
}

export interface StartedModule {
  module: ReadingModuleId;
  title: string;
  promise: Promise<ModuleReading>;
}

export interface StartedReading {
  /** 5개 병렬 모듈 + overall(마지막). 각 promise 는 reject 하지 않고 ok:false 로 귀결된다. */
  modules: StartedModule[];
  /** 전체 완료 시점의 FullReading. */
  full: Promise<FullReading>;
}

/**
 * 6모듈 생성을 시작하고 모듈별 promise 를 즉시 돌려준다 — 완료되는 모듈부터 UI 스트리밍용.
 * 앞 5모듈은 병렬, 종합(overall)은 성공한 본문을 입력으로 마지막에 생성.
 */
export function startReading(input: ReadingInput, deps: ReadingDeps): StartedReading {
  const summary = input.chartSummary ?? buildChartSummaryEn(input.chart);

  const parallel: StartedModule[] = PARALLEL_MODULES.map((m) => ({
    module: m,
    title: MODULE_SPECS[m].title,
    promise: generateModule(m, summary, undefined, deps),
  }));

  const overallPromise = Promise.all(parallel.map((p) => p.promise)).then((settled) =>
    generateModule(
      'overall',
      summary,
      settled.filter((m) => m.ok).map((m) => m.body),
      deps,
    ),
  );

  const full = Promise.all([...parallel.map((p) => p.promise), overallPromise]).then(
    (modules) => ({
      modules,
      promptVersion: READING_PROMPT_VERSION,
      partial: modules.some((m) => !m.ok),
    }),
  );

  return {
    modules: [
      ...parallel,
      { module: 'overall', title: MODULE_SPECS.overall.title, promise: overallPromise },
    ],
    full,
  };
}

/**
 * 6모듈 풀이를 생성한다(블로킹). 일부 모듈이 실패해도 성공분 + 실패 표식으로 부분복구한다(partial=true).
 */
export async function generateReading(input: ReadingInput, deps: ReadingDeps): Promise<FullReading> {
  return startReading(input, deps).full;
}
