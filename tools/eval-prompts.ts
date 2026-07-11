#!/usr/bin/env -S npx tsx
// Live eval harness for the Phase 2 English prompts — calls the real Anthropic API against 4
// fixed, diverse charts (one domestic Seoul birth, three international births exercising
// chart-input/international-birth.ts) across every reading surface: solo (all 6 modules), the
// free teaser, 3 oracle draws, and the couple/love-marriage/career menus.
//
// For every generated body, asserts: no CJK leak, no raw-data leak, guard-safe, and (for reading
// modules/menus) a word count within the LENGTH_BLOCK band. Prints a summary table and writes
// full transcripts to eval-output/ (gitignored — never committed).
//
// Usage: pnpm eval:prompts   (requires ANTHROPIC_API_KEY in K-saju/.env, gitignored)
import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AnthropicLlmClient } from '../src/llm';
import { internationalBirthToSajuChart } from '../src/chart-input/international-birth';
import { birthToSajuChart } from '../src/chart-input/manseryeok-adapter';
import { buildFullChart } from '../src/saju-engine';
import type { FullSajuChart } from '../src/saju-engine';
import { generateReading } from '../src/reading/generate';
import { generateSummary } from '../src/reading/summary';
import { drawOracle } from '../src/oracle/index';
import { findQuestion } from '../src/oracle/questions-en';
import { runCouple } from '../src/menus/couple';
import { runLoveMarriage } from '../src/menus/love-marriage';
import { runCareer } from '../src/menus/career';
import { hasCjkLeak } from '../src/reading/sanitize-en';
import { hasRawLeak } from '../src/reading/sanitize';
import { checkContentSafety } from '../src/reading/guard';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../eval-output');
mkdirSync(OUT_DIR, { recursive: true });

const llm = new AnthropicLlmClient();

// ── 4 fixed, diverse charts (real engine output, not hand-crafted fixtures) ──────────────────
interface EvalChart {
  label: string;
  chart: FullSajuChart;
}

const CHARTS: EvalChart[] = [
  {
    label: 'seoul-1990',
    chart: buildFullChart(
      birthToSajuChart({ year: 1990, month: 5, day: 15, hour: 14, minute: 30 }),
      { gender: '여', daewoonStartAge: 3, daewoonCount: 8 },
    ),
  },
  {
    label: 'nyc-1995',
    chart: buildFullChart(
      internationalBirthToSajuChart({ year: 1995, month: 11, day: 3, hour: 9, minute: 15, timeZone: 'America/New_York', longitude: -74.006 }),
      { gender: '남', daewoonStartAge: 5, daewoonCount: 8 },
    ),
  },
  {
    label: 'london-2000',
    chart: buildFullChart(
      internationalBirthToSajuChart({ year: 2000, month: 2, day: 20, hour: 3, minute: 45, timeZone: 'Europe/London', longitude: -0.1276 }),
      { gender: '여', daewoonStartAge: 2, daewoonCount: 8 },
    ),
  },
  {
    label: 'la-1988',
    chart: buildFullChart(
      internationalBirthToSajuChart({ year: 1988, month: 8, day: 8, hour: 12, minute: 0, timeZone: 'America/Los_Angeles', longitude: -118.2437 }),
      { gender: '남', daewoonStartAge: 7, daewoonCount: 8 },
    ),
  },
];

// ── word-count bands (see frame-en-v1.ts LENGTH_BLOCK / modules-en.ts overall / teaser-en.ts) ─
const BANDS: Record<string, [number, number]> = {
  module: [130, 320], // 180-280 target, generous margin either side for a live-eval pass/fail gate
  overall: [90, 260], // 150-200 target
  teaser: [25, 100], // 40-70 target
};

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

interface EvalRow {
  chart: string;
  task: string;
  subtask: string;
  ok: boolean;
  words: number | '-';
  cjkLeak: boolean;
  rawLeak: boolean;
  guardSafe: boolean;
  bandOk: boolean | '-';
  notes: string;
}

const rows: EvalRow[] = [];

function checkBody(chart: string, task: string, subtask: string, body: string, band?: [number, number]): void {
  const cjk = hasCjkLeak(body);
  const raw = hasRawLeak(body);
  const safety = checkContentSafety(body);
  const words = body ? wordCount(body) : 0;
  const bandOk: boolean | '-' = band ? words >= band[0] && words <= band[1] : '-';
  const ok = !cjk && !raw && safety.safe && (band ? bandOk === true : true) && body.length > 0;
  rows.push({
    chart, task, subtask, ok, words: body ? words : '-',
    cjkLeak: cjk, rawLeak: raw, guardSafe: safety.safe, bandOk,
    notes: !safety.safe ? `guard: ${safety.reason}` : (band && bandOk === false ? `words out of band ${band[0]}-${band[1]}` : ''),
  });
  writeFileSync(
    path.join(OUT_DIR, `${chart}__${task}__${subtask}.txt`.replace(/[^a-zA-Z0-9_.-]/g, '_')),
    body,
    'utf-8',
  );
}

async function evalSolo(ec: EvalChart): Promise<void> {
  const reading = await generateReading({ chart: ec.chart }, { llm });
  for (const m of reading.modules) {
    const band = m.module === 'overall' ? BANDS.overall : BANDS.module;
    if (!m.ok) {
      rows.push({ chart: ec.label, task: 'solo', subtask: m.module, ok: false, words: '-', cjkLeak: false, rawLeak: false, guardSafe: false, bandOk: '-', notes: `generation failed: ${m.error}` });
      continue;
    }
    checkBody(ec.label, 'solo', m.module, m.body, band);
  }
}

async function evalTeaser(ec: EvalChart): Promise<void> {
  try {
    const body = await generateSummary({ chart: ec.chart }, { llm });
    checkBody(ec.label, 'teaser', 'teaser', body, BANDS.teaser);
  } catch (e) {
    rows.push({ chart: ec.label, task: 'teaser', subtask: 'teaser', ok: false, words: '-', cjkLeak: false, rawLeak: false, guardSafe: false, bandOk: '-', notes: `threw: ${e instanceof Error ? e.message : String(e)}` });
  }
}

const ORACLE_QUESTION_IDS = ['crush-1', 'career-2', 'choice-9'];

async function evalOracle(ec: EvalChart): Promise<void> {
  for (const qid of ORACLE_QUESTION_IDS) {
    const q = findQuestion(qid);
    if (!q) throw new Error(`eval-prompts: unknown oracle question id ${qid}`);
    try {
      const draw = await drawOracle({ chart: ec.chart, question: q.text }, { llm });
      const combined = `${draw.answer}\n\n${draw.reason}`;
      checkBody(ec.label, 'oracle', qid, combined);
    } catch (e) {
      rows.push({ chart: ec.label, task: 'oracle', subtask: qid, ok: false, words: '-', cjkLeak: false, rawLeak: false, guardSafe: false, bandOk: '-', notes: `threw: ${e instanceof Error ? e.message : String(e)}` });
    }
  }
}

async function evalLoveMarriage(ec: EvalChart): Promise<void> {
  const r = await runLoveMarriage({ menu: 'love-marriage', subject: { chart: ec.chart } }, { llm, unlocked: true });
  const section = r.sections[0]!;
  if (!section.ok) {
    rows.push({ chart: ec.label, task: 'love-marriage', subtask: 'love-marriage', ok: false, words: '-', cjkLeak: false, rawLeak: false, guardSafe: false, bandOk: '-', notes: 'generation failed' });
    return;
  }
  checkBody(ec.label, 'love-marriage', 'love-marriage', section.body, BANDS.module);
}

async function evalCareer(ec: EvalChart): Promise<void> {
  const r = await runCareer({ menu: 'career', subject: { chart: ec.chart } }, { llm, unlocked: true });
  const section = r.sections[0]!;
  if (!section.ok) {
    rows.push({ chart: ec.label, task: 'career', subtask: 'career', ok: false, words: '-', cjkLeak: false, rawLeak: false, guardSafe: false, bandOk: '-', notes: 'generation failed' });
    return;
  }
  checkBody(ec.label, 'career', 'career', section.body, BANDS.module);
}

async function evalCouple(pairLabel: string, a: EvalChart, b: EvalChart): Promise<void> {
  const r = await runCouple({ menu: 'couple', person: { chart: a.chart }, partner: { chart: b.chart } }, { llm, unlocked: true });
  const section = r.sections[0]!;
  if (!section.ok) {
    rows.push({ chart: pairLabel, task: 'couple', subtask: 'couple', ok: false, words: '-', cjkLeak: false, rawLeak: false, guardSafe: false, bandOk: '-', notes: 'generation failed' });
    return;
  }
  checkBody(pairLabel, 'couple', 'couple', section.body, BANDS.module);
}

async function main(): Promise<void> {
  console.log(`Running eval across ${CHARTS.length} charts — this makes real Anthropic API calls.\n`);

  for (const ec of CHARTS) {
    console.log(`solo + teaser + oracle + love-marriage + career: ${ec.label}`);
    await evalSolo(ec);
    await evalTeaser(ec);
    await evalOracle(ec);
    await evalLoveMarriage(ec);
    await evalCareer(ec);
  }

  console.log('couple: seoul-1990 x nyc-1995, london-2000 x la-1988');
  await evalCouple('seoul-1990_x_nyc-1995', CHARTS[0]!, CHARTS[1]!);
  await evalCouple('london-2000_x_la-1988', CHARTS[2]!, CHARTS[3]!);

  // ── summary table ──────────────────────────────────────────────────────────────────────────
  const header = ['chart', 'task', 'subtask', 'ok', 'words', 'cjkLeak', 'rawLeak', 'guardSafe', 'bandOk', 'notes'];
  const widths = header.map((h) => Math.max(h.length, ...rows.map((r) => String(r[h as keyof EvalRow]).length)));
  const fmt = (vals: string[]) => vals.map((v, i) => v.padEnd(widths[i]!)).join(' | ');
  console.log('\n' + fmt(header));
  console.log(widths.map((w) => '-'.repeat(w)).join('-|-'));
  for (const r of rows) {
    console.log(fmt(header.map((h) => String(r[h as keyof EvalRow]))));
  }

  const failed = rows.filter((r) => !r.ok);
  console.log(`\n${rows.length - failed.length}/${rows.length} passed.`);
  if (failed.length) {
    console.log(`${failed.length} FAILED:`);
    for (const f of failed) console.log(`  - ${f.chart} / ${f.task} / ${f.subtask}: ${f.notes}`);
  }

  writeFileSync(path.join(OUT_DIR, '_summary.json'), JSON.stringify(rows, null, 2), 'utf-8');
  console.log(`\nFull transcripts + summary written to ${OUT_DIR}`);

  if (failed.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
