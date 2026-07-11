import 'server-only';
import { buildFullChart } from '@engine/saju-engine';
import type { FullSajuChart } from '@engine/saju-engine';
import {
  internationalBirthToSajuChart,
  type InternationalBirthInput,
} from '@engine/chart-input/international-birth';
import { generateReading } from '@engine/reading/generate';
import { generateSummary } from '@engine/reading/summary';
import type { FullReading } from '@engine/reading/types';
import { drawOracle } from '@engine/oracle';
import type { OracleDraw } from '@engine/oracle';
// NOTE: K-saju's engine has no `menus` barrel and no `runMenu` — the Korean web's `@engine/menus`
// re-export was intentionally dropped (see ENGINE_SYNC.md). We import each runner directly.
import { startSolo, runSolo } from '@engine/menus/solo';
import type { StartedMenu } from '@engine/menus/solo';
import { runCouple } from '@engine/menus/couple';
import { runLoveMarriage } from '@engine/menus/love-marriage';
import { runCareer } from '@engine/menus/career';
import type { MenuResult, MenuDeps } from '@engine/menus/types';
import { AnthropicLlmClient } from '@engine/llm/anthropic-client';
import type { LlmClient } from '@engine/llm';
import type { BirthFields } from './birth-params';
import { scoreCompatibility } from '@engine/compatibility';
import type { CompatScore } from '@engine/compatibility';

const DAEWOON_START_AGE = 3;
const DAEWOON_COUNT = 8;

export interface EngineDeps {
  llm?: LlmClient;
  moduleRetries?: number;
  unlocked?: boolean;
}

function resolveLlm(deps?: EngineDeps): LlmClient {
  if (deps?.llm) return deps.llm;
  if (!process.env['ANTHROPIC_API_KEY']) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required.');
  }
  // maxTokens 2560: 1024 left readings truncated mid-sentence; give each section room to finish.
  return new AnthropicLlmClient({ maxTokens: 2560 });
}

/** LLM for the free home teaser only. Teasers are short, so keep maxTokens small (512). */
function resolveSummaryLlm(deps?: EngineDeps): LlmClient {
  if (deps?.llm) return deps.llm;
  if (!process.env['ANTHROPIC_API_KEY']) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required.');
  }
  return new AnthropicLlmClient({ maxTokens: 512 });
}

function toBirthInput(f: BirthFields): InternationalBirthInput {
  const input: InternationalBirthInput = {
    year: f.year,
    month: f.month,
    day: f.day,
    timeZone: f.timeZone,
    longitude: f.longitude,
  };
  if (f.hour !== undefined) input.hour = f.hour;
  if (f.minute !== undefined) input.minute = f.minute;
  return input;
}

export function buildChart(f: BirthFields): FullSajuChart {
  const chart = internationalBirthToSajuChart(toBirthInput(f));
  return buildFullChart(chart, {
    // Single interop translation boundary: the frozen Korean engine expects '남'/'여'.
    // No Korean appears anywhere else in this layer.
    gender: f.gender === 'M' ? '남' : '여',
    daewoonStartAge: DAEWOON_START_AGE,
    daewoonCount: DAEWOON_COUNT,
  });
}

export async function computeReading(f: BirthFields, deps?: EngineDeps): Promise<FullReading> {
  const chart = buildChart(f);
  return generateReading(
    { chart },
    { llm: resolveLlm(deps), moduleRetries: deps?.moduleRetries },
  );
}

/**
 * Free home (/result) teaser summary — a single low-cost LLM call over the chart summary.
 * The full 6-module reading (computeReading) is the paid /menu/solo path, not generated here.
 */
export async function computeSummary(f: BirthFields, deps?: EngineDeps): Promise<string> {
  const chart = buildChart(f);
  return generateSummary(
    { chart },
    { llm: resolveSummaryLlm(deps), moduleRetries: deps?.moduleRetries },
  );
}

function menuDeps(deps?: EngineDeps): MenuDeps {
  const out: MenuDeps = { llm: resolveLlm(deps), unlocked: deps?.unlocked ?? false };
  if (deps?.moduleRetries !== undefined) out.moduleRetries = deps.moduleRetries;
  return out;
}

export async function computeSoloMenu(f: BirthFields, deps?: EngineDeps): Promise<MenuResult> {
  return runSolo({ menu: 'solo', subject: { chart: buildChart(f) } }, menuDeps(deps));
}

/**
 * Starts the solo 6-module generation and returns section promises immediately — for streaming
 * render at /menu/solo. Always starts unlocked, so call only after the payment gate has passed.
 */
export function startSoloMenu(f: BirthFields, deps?: EngineDeps): StartedMenu {
  return startSolo(
    { menu: 'solo', subject: { chart: buildChart(f) } },
    menuDeps({ ...deps, unlocked: true }),
  );
}

export async function computeLoveMarriageMenu(f: BirthFields, deps?: EngineDeps): Promise<MenuResult> {
  return runLoveMarriage({ menu: 'love-marriage', subject: { chart: buildChart(f) } }, menuDeps(deps));
}

export async function computeCoupleMenu(
  person: BirthFields,
  partner: BirthFields,
  deps?: EngineDeps,
): Promise<MenuResult> {
  return runCouple(
    { menu: 'couple', person: { chart: buildChart(person) }, partner: { chart: buildChart(partner) } },
    menuDeps(deps),
  );
}

export async function computeCareerMenu(f: BirthFields, deps?: EngineDeps): Promise<MenuResult> {
  return runCareer({ menu: 'career', subject: { chart: buildChart(f) } }, menuDeps(deps));
}

/** Compatibility score (free, deterministic, no LLM). Builds both charts and scores them. */
export function computeCompatScore(person: BirthFields, partner: BirthFields): CompatScore {
  return scoreCompatibility(buildChart(person), buildChart(partner));
}

/** Oracle draw — birth + question -> a short one-line answer + reason (single LLM call). */
export async function computeOracleDraw(
  f: BirthFields,
  question: string,
  deps?: EngineDeps,
): Promise<OracleDraw> {
  return drawOracle({ chart: buildChart(f), question }, { llm: resolveLlm(deps) });
}
