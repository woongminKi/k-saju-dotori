import { startReading } from '../reading/generate';
import type { MenuInput, MenuResult, MenuDeps, MenuSection } from './types';
import { buildTeaser } from './teaser';
import { applyPaywall } from './paywall';

export interface StartedMenuSection {
  id: string;
  title: string;
  section: Promise<MenuSection>;
}

export interface StartedMenu {
  /** 완료되는 순서대로 소비 가능한 섹션 promise 들 (overall 은 마지막 원소). */
  sections: StartedMenuSection[];
  /** 전체 완료 시점의 MenuResult (paywall 적용됨). */
  result: Promise<MenuResult>;
}

/**
 * 솔로 6모듈 생성을 시작하고 섹션별 promise 를 즉시 돌려준다 — UI 스트리밍용.
 * 주의: 섹션 promise 본문에는 paywall 이 적용되지 않으므로 결제 게이트(잔액 확인)를
 * 통과한 뒤에만 호출할 것. result 에는 기존과 동일하게 paywall 이 적용된다.
 */
export function startSolo(
  input: Extract<MenuInput, { menu: 'solo' }>,
  deps: MenuDeps,
): StartedMenu {
  const started = startReading(
    { chart: input.subject.chart, chartSummary: input.subject.chartSummary },
    { llm: deps.llm, moduleRetries: deps.moduleRetries },
  );

  const sections = started.modules.map((m) => ({
    id: m.module,
    title: m.title,
    section: m.promise.then((r) => ({ id: r.module, title: r.title, body: r.body, ok: r.ok })),
  }));

  const result = started.full.then((reading) => {
    const secs = reading.modules.map((m) => ({
      id: m.module,
      title: m.title,
      body: m.body,
      ok: m.ok,
    }));
    const full: MenuResult = {
      menu: 'solo',
      sections: secs,
      teaser: buildTeaser(secs),
      locked: false,
      promptVersion: reading.promptVersion,
      partial: reading.partial,
    };
    return applyPaywall(full, deps.unlocked ?? false);
  });

  return { sections, result };
}

/** 솔로(자신 사주) — reading 6모듈을 그대로 섹션으로 (블로킹). */
export async function runSolo(
  input: Extract<MenuInput, { menu: 'solo' }>,
  deps: MenuDeps,
): Promise<MenuResult> {
  return startSolo(input, deps).result;
}
