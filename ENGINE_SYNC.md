# ENGINE_SYNC — Dotori (K-saju) engine core sync log

- **Source repo:** `piLab/project/saju` (read-only — never modified by this sync)
- **Source HEAD at copy time:** `1ad13e27a8e1abf51035ac45e9a9453e093ee968`
- **Copy date:** 2026-07-11

## Rule

Verbatim files are never edited in Dotori. Behavior changes (English content, rules, catalogs)
go in `-en` sibling files (e.g. `frame-v1.ts` → `prompts/frame-en-v1.ts`), never in the copied
file itself. The only edits allowed in a verbatim file are import specifier lines that point at
a relocated path or an `-en` stub, and those are listed below. Two files required an edit beyond
an import line because the manifest excluded their sole dependency with no replacement — those
are called out explicitly under "Deviations from the manifest" and were judgment calls, not
manifest instructions.

## File manifest

| Korean path | Dotori path | Status |
|---|---|---|
| `src/saju-engine/**` (incl. tests) | `src/saju-engine/**` | verbatim |
| `src/llm/**` (incl. tests) | `src/llm/**` | verbatim |
| `src/naming-engine/llm.ts` | `src/naming-engine/llm.ts` | verbatim — **addition, see deviations** |
| `src/naming-engine/types.ts` | `src/naming-engine/types.ts` **and** `src/chart-input/types.ts` | verbatim, present at both paths — **addition, see deviations** |
| `src/naming-engine/_element-tables.ts` | `src/naming-engine/_element-tables.ts` **and** `src/chart-input/_element-tables.ts` | verbatim, present at both paths — **addition, see deviations** |
| `src/naming-engine/manseryeok-adapter.ts` | `src/chart-input/manseryeok-adapter.ts` | relocated |
| `src/naming-engine/__tests__/manseryeok-adapter.test.ts` | `src/chart-input/__tests__/manseryeok-adapter.test.ts` | relocated |
| `src/naming-engine/{scorer,candidate-generator,hanja-repo,orchestrator,fixture-repo,static-data-repo*,supplement-resolver,hard-filter,output-validator,interpret-layer,name-checks,select-top-k,_suri,_phonetics,_deterministic-text,_element-relations,config/**,prompts/**}` | — | dropped (naming product, per manifest) |
| `src/compatibility/index.ts` | `src/compatibility/index.ts` | relocated-import-fix — **+ 1 deviation edit, see below** |
| `src/compatibility/score.ts` | `src/compatibility/score.ts` | relocated-import-fix |
| `src/compatibility/branch-relations.ts`, `types.ts` | same | verbatim |
| `src/compatibility/__tests__/branch-relations.test.ts` | same | verbatim |
| `src/compatibility/__tests__/score.test.ts` | same | **content-edit — see deviations** (teaser describe block removed) |
| `src/compatibility/teaser.ts` | — | dropped (per manifest, explicit exclusion) |
| `src/reading/generate.ts` | same | relocated-import-fix |
| `src/reading/summary.ts` | same | relocated-import-fix |
| `src/reading/sanitize.ts`, `types.ts`, `chart-summary.ts`, `character.ts` | same | verbatim |
| `src/reading/__tests__/character.test.ts`, `chart-summary.test.ts`, `sanitize.test.ts`, `types.test.ts` | same | verbatim |
| `src/reading/__tests__/generate.test.ts` | — | dropped — see deviations |
| `src/reading/__tests__/summary.test.ts` | — | dropped — see deviations |
| `src/reading/__tests__/guard.test.ts`, `index.test.ts`, `modules.test.ts`, `frame-v1.test.ts`, `prompts-shared-block.test.ts` | — | dropped (test Korean guard/prompts/barrel not carried over) |
| `src/reading/prompts/frame-v1.ts` | `src/reading/prompts/frame-en-v1.ts` | stub-for-phase2 |
| `src/reading/prompts/modules.ts` | `src/reading/prompts/modules-en.ts` | stub-for-phase2 |
| `src/reading/prompts/teaser.ts` | `src/reading/prompts/teaser-en.ts` | stub-for-phase2 |
| `src/reading/guard.ts` | `src/reading/guard.ts` | **authored in Phase 1** (English rules, same `{safe, reason?}` contract — started as a Phase 0 stub, fully authored/expanded in Phase 1, see Phase 1 section below) |
| `src/reading/index.ts` | — | dropped (barrel; re-exports dropped Korean prompt files, no consumer needs it in Phase 0) |
| — | `src/i18n/glossary-en.ts` | new skeleton |
| `src/menus/_generate-section.ts` | same | relocated-import-fix |
| `src/menus/paywall.ts`, `types.ts` | same | verbatim / **types.ts has 1 deviation edit, see below** |
| `src/menus/solo.ts` | same | verbatim (already imported `../reading/generate` and `./teaser` directly — no barrel dependency) |
| `src/menus/couple.ts`, `love-marriage.ts`, `career.ts` | same | relocated-import-fix |
| `src/menus/teaser.ts` | same | verbatim — **addition, see deviations** |
| `src/menus/__tests__/_fixtures.ts`, `solo.test.ts`, `paywall.test.ts`, `career.test.ts`, `types.test.ts`, `teaser.test.ts` | same | verbatim |
| `src/menus/__tests__/_generate-section.test.ts`, `love-marriage.test.ts` | same | **content-edit — see deviations** (1 Korean-guard-dependent sub-test removed from each) |
| `src/menus/__tests__/couple.test.ts` | — | dropped — see deviations (its only test asserts Korean pair-labels from the dropped `menus/prompts.ts`) |
| `src/menus/prompts.ts` | `src/menus/prompts-en.ts` | stub-for-phase2 (narrowed to love-marriage/couple/career specs only — see file comment) |
| `src/menus/{naming,newyear,reunion,intimacy}.ts`, `index.ts` | — | dropped (per manifest / barrel not needed) |
| `src/menus/__tests__/{naming,newyear,reunion,intimacy,index,prompts}.test.ts` | — | dropped (test dropped runners/prompts) |
| `src/oracle/index.ts` | same | relocated-import-fix |
| `src/oracle/prompt.ts` | `src/oracle/prompt-en.ts` | stub-for-phase2 |
| `src/oracle/questions.ts` | `src/oracle/questions-en.ts` | stub-for-phase2 (3 English placeholder questions per category, not full 20) |
| `src/oracle/__tests__/oracle.test.ts` | — | dropped — see deviations |

## Import-line fixes (relocated-import-fix files)

- `src/compatibility/score.ts`: `'../naming-engine/types'` → `'../chart-input/types'`; `'../naming-engine/_element-tables'` → `'../chart-input/_element-tables'`
- `src/reading/generate.ts`: `'./prompts/modules'` → `'./prompts/modules-en'`; `'./prompts/frame-v1'` → `'./prompts/frame-en-v1'`
- `src/reading/summary.ts`: `'./prompts/teaser'` → `'./prompts/teaser-en'`
- `src/menus/_generate-section.ts`: `import { sanitizeBody, hasRawLeak, checkContentSafety } from '../reading'` → split into `from '../reading/sanitize'` (sanitizeBody, hasRawLeak) and `from '../reading/guard'` (checkContentSafety)
- `src/menus/couple.ts`, `love-marriage.ts`, `career.ts`: `import { buildChartSummary, READING_PROMPT_VERSION } from '../reading'` → split into `from '../reading/chart-summary'` and `from '../reading/prompts/frame-en-v1'`; `from './prompts'` → `from './prompts-en'`
- `src/oracle/index.ts`: `'./prompt'` → `'./prompt-en'` (2 lines); `'./questions'` → `'./questions-en'` (2 lines)

## Deviations from the manifest (judgment calls — not explicitly covered)

1. **`src/naming-engine/llm.ts`, `types.ts`, `_element-tables.ts` copied verbatim, kept at their
   original path (in addition to the `chart-input` relocated copies of `types.ts` /
   `_element-tables.ts`).** `src/llm/index.ts` and `src/llm/anthropic-client.ts` (mandated
   verbatim copies) import `LlmClient`/`LlmCompletionOptions`/`LlmSystem`/`LlmSystemBlock` from
   `../naming-engine/llm`. More significantly, **`src/saju-engine/**` itself — which the manifest
   mandates copying with zero exceptions — imports `Element`/`ElementCount` and `stemElement`
   etc. from `../naming-engine/types` and `../naming-engine/_element-tables`** (`chart.ts`,
   `five-elements.ts`, `sinsal.ts`, `ten-gods.ts`, `types.ts`, plus 3 of their tests). Since
   `saju-engine` may never be edited (not even an import line, per the manifest), the only way to
   satisfy that mandate was to make `../naming-engine/types` and `../naming-engine/_element-tables`
   resolve — i.e. keep those two files at their original path too. None of the three files
   (`llm.ts`, `types.ts`, `_element-tables.ts`) contain Korean or naming-product content (generic
   LLM interface + Element/Pillar/SajuChart type defs + Element relation tables); the manifest's
   naming-engine drop list (scorer/candidate-generator/hanja-repo/orchestrator/prompts//
   fixture-repo/static-data-repo-factory/config) doesn't name any of them. Net effect: **zero
   edits** were needed in `src/saju-engine/**` or `src/llm/**` to consume them. `types.ts` and
   `_element-tables.ts` now exist at two identical paths (`naming-engine/` and `chart-input/`) —
   harmless duplication, not a behavior risk, since both are byte-identical to the Korean source
   and neither is ever edited.

2. **`src/menus/teaser.ts` copied verbatim (an addition).** It wasn't in the enumerated menus/
   copy list, but `solo.ts`, `couple.ts`, `love-marriage.ts`, `career.ts` (all explicitly
   requested) hard-import `buildTeaser` from it. It's deterministic (no LLM), so it was copied
   as-is along with its test (`__tests__/teaser.test.ts`), which passes unchanged.

3. **`src/compatibility/index.ts`: dropped the `export { tierTeaser } from './teaser'` line.**
   `compatibility/teaser.ts` was explicitly excluded by the manifest, and — unlike the reading
   prompts — no `-en` stub was commissioned for it (it's a static Korean tier→string dictionary,
   not an LLM prompt). Re-exporting a module that doesn't exist would break the build, so the one
   export line was removed. Its test (`compatibility/__tests__/score.test.ts`) had a second
   `describe('compatibility/teaser', ...)` block at the bottom that imported `tierTeaser` — that
   block (4 lines + import) was removed, leaving the `scoreCompatibility` tests intact. **If a
   compatibility-tier free teaser is wanted in English, it needs its own `-en` stub in a later
   phase**, same treatment as the reading/menu teasers.

4. **`src/menus/types.ts`: dropped only the `HanjaRepo` type and the `naming` field of
   `MenuDeps`** (`naming?: { repo: HanjaRepo; weights: NamingWeights }` → removed entirely).
   `HanjaRepo` lives in `naming-engine/hanja-repo.ts`, which the manifest explicitly excludes as a
   naming-product file, and `src/menus/naming.ts` (the only consumer of this field) is also
   explicitly dropped — so the field was dead code with an unresolvable import. `NamingRequest`
   and `NamingWeights`, however, **were kept** (import relocated to `'../naming-engine/types'`,
   which resolves — see deviation 1) since `NamingRequest` is still referenced by the `'naming'`
   variant of the `MenuInput` union, which was left in place (along with `'naming'` in
   `MenuId`/`MENU_IDS`) because `menus/__tests__/types.test.ts` (kept verbatim) asserts `MENU_IDS`
   equals all 8 ids.

5. **Dropped 3 test files, and removed 2 individual sub-tests from 2 otherwise-kept test files,**
   whose assertions depend on dropped/placeholder Korean content (source files resolve fine after
   import-line fixes; only specific assertions/fixtures inside them hard-code Korean text tied to
   the intentionally-English-rewritten guard.ts or the intentionally-placeholder prompt stubs):
   - `src/reading/__tests__/generate.test.ts` (dropped, whole file) — asserts `system[0].text`
     contains literal Korean strings from `SHARED_SYSTEM_BLOCK1` (e.g. `'구어체'`, `'관살혼잡'`)
     and module title `'일간 본질'`, which only exist in the real Korean frame/modules files, not
     the English stubs.
   - `src/reading/__tests__/summary.test.ts` (dropped, whole file) — asserts on `buildTeaserPrompt`
     output containing Korean strings (`'한자'`, `'티저'`, `'100~180자'`) specific to the real
     Korean teaser prompt.
   - `src/oracle/__tests__/oracle.test.ts` (dropped, whole file) — asserts
     `findQuestion('career-1')?.text` contains `'이직'` (Korean for "job change"), which doesn't
     exist in the 3-question-per-category English placeholder set.
   - `src/menus/__tests__/_generate-section.test.ts` (1 of 4 sub-tests removed) — the
     `'생사 단정이면 재시도 후 ok:false'` case fed the mock LLM the Korean death-prediction phrase
     `'곧 죽는다'`, which the old Korean `guard.ts` regex caught but the new English `guard.ts`
     (by design, per the Phase 0 spec) does not recognize. The other 3 sub-tests (sanitize pass,
     empty-response, system-block passthrough) are language-agnostic and were kept.
   - `src/menus/__tests__/love-marriage.test.ts` (1 of 2 sub-tests removed) — same root cause
     (`'곧 죽는다'` mock trigger no longer caught by the English guard). The happy-path test was
     kept.
   - `src/menus/__tests__/couple.test.ts` (dropped, whole file — its only test) — the mock LLM
     responder asserts `expect(prompt).toContain('사람 1')` / `'사람 2'`, the Korean default pair
     labels from the dropped `menus/prompts.ts`. The English stub (`menus/prompts-en.ts`) uses
     `'Person 1'`/`'Person 2'` by design, so the assertion no longer matches; since
     `generateSection`'s catch-all retry loop swallows the resulting `AssertionError`, the test
     failed with a confusing "empty body" symptom rather than a clear assertion mismatch.
   None of these six edits touch source files — only test files, and only the specific
   Korean-content-dependent lines/blocks, per the "drop test content that depends on dropped
   Korean content, don't hand-edit assertions to force a pass" rule. A future phase revisiting
   `guard.ts` (Phase 1) or `menus/prompts-en.ts` (Phase 2) should consider re-adding
   English-language equivalents of the removed sub-tests.

## Verification (Phase 0, 2026-07-11)

- `pnpm install`: clean, no errors.
- `pnpm typecheck` (`tsc --noEmit`): passes, 0 errors.
- `pnpm test` (`vitest run`): **23 test files passed, 120 tests passed, 0 failed.**

---

# Phase 1 — Engine internationalization (2026-07-11)

New/changed files this phase, all additive — no verbatim engine file (`saju-engine/**`,
`llm/**`, `naming-engine/llm.ts`/`types.ts`/`_element-tables.ts`, `manseryeok-adapter.ts`,
`reading/sanitize.ts`, `reading/character.ts`, `reading/chart-summary.ts`) was edited.

| File | Status |
|---|---|
| `src/chart-input/international-birth.ts` | new — `internationalBirthToSajuChart()`, see risk probe below |
| `src/chart-input/__tests__/international-birth.test.ts` | new — 22 tests |
| `src/i18n/glossary-en.ts` | completed (was a 6-entry Phase 0 skeleton) — see glossary section below |
| `src/i18n/__tests__/glossary-en.test.ts` | new — 12 tests, completeness tripwire |
| `src/reading/chart-summary-en.ts` | new — English sibling of `chart-summary.ts`, never edits it |
| `src/reading/__tests__/chart-summary-en.test.ts` | new — 3 tests |
| `src/reading/sanitize-en.ts` | new — `hasCjkLeak()`. **`sanitize.ts` itself is untouched** (verbatim rule); this was briefly violated and then reverted — see deviation note below |
| `src/reading/__tests__/sanitize-en.test.ts` | new — 6 tests |
| `src/reading/guard.ts` | authored in Phase 1 (see manifest table above) — 4 rule categories now |
| `src/reading/__tests__/guard.test.ts` | new in Phase 1, expanded — 31 tests |
| `src/reading/generate.ts`, `summary.ts`, `oracle/index.ts`, `menus/{couple,love-marriage,career}.ts` | import-line fix: now use `buildChartSummaryEn` (was still wired to the Korean `buildChartSummary` after Phase 0 — see deviation note) |
| `src/reading/generate.ts`, `summary.ts`, `menus/_generate-section.ts` | import-line fix: `hasCjkLeak` now imported from `./sanitize-en` (was briefly added directly to `sanitize.ts` — reverted) |

## Risk probe outcome: `calculateSaju`'s longitude correction is unsafe outside Korea

Read the library's own source (`@fullstackfamily/manseryeok` `dist/index.mjs`, `calculateSaju`):

```js
const longitudeCorrection = Math.round((135 - longitude) * 4); // minutes
calcMinute = solarMinute - longitudeCorrection;
calcHour = solarHour;
if (calcMinute < 0) { calcMinute += 60; calcHour -= 1; }   // ONE borrow only
if (calcHour < 0) { calcHour += 24; }                       // ONE wrap only, date never rolls
```

This is correct for Korea-scale corrections (verified byte-for-byte against both worked README
examples: Seoul 127° 14:30→13:58, Busan 129° 14:00→13:36) but **silently wrong** for any
correction beyond about ±60 minutes (roughly ±15° from 135°E) — confirmed empirically: calling
`calculateSaju` directly with the same date/hour and longitudes 127, 0, -74, -118, -170 all
returned the *identical* hour pillar, because the single ±1-hour borrow isn't enough to even
cross a two-hour branch boundary, and a longitude like New York's (-74.006) needs a ~14-hour
correction that this code cannot express.

**Path taken (per the "if the library clamps/rejects, fall back..." instruction):**
`international-birth.ts` never calls `calculateSaju` with `applyTimeCorrection: true`. It
replicates the library's own formula — `correctionMinutes = (longitude - 135) * 4` — itself via
`Date` UTC arithmetic (which correctly carries minute→hour→day→month→year), applies that to the
KST-equivalent reading, then calls `calculateSaju(..., { applyTimeCorrection: false })`. Verified:
(a) byte-for-byte identical output to the library's own corrected result for both README examples,
(b) a genuinely different, date-rolled hour+day pillar for New York's longitude where the
library's own path silently no-ops. This is exercised directly in the "risk probe" describe block
of `international-birth.test.ts`.

## DST gap/ambiguity algorithm — also revised mid-phase

The first implementation used an iterative 2-pass offset guess (guess → correct → re-check). It
handled every case correctly **except** genuine fall-back ambiguity: the two passes could both
land on the same (pre-transition) side and never surface the second, equally valid, later
occurrence. Replaced with an approach that probes two independent reference offsets — noon Jan 1
and noon Jul 1 of the relevant year — which reliably samples both of a zone's standing offsets
regardless of hemisphere or which direction a transition runs, without depending on iteration
convergence order. Policy (documented in code + tested):
- **Gap** (nonexistent wall-clock time, e.g. 2:30 AM on a spring-forward day): shift the
  wall-clock reading forward by the gap size and resolve using the post-transition offset.
- **Ambiguity** (repeated wall-clock time, e.g. 1:30 AM on a fall-back day): choose the **earlier**
  of the two real instants (the pre-transition/DST offset).
Covered by dedicated tests for both directions (US spring-forward/fall-back, London BST-start,
Southern-hemisphere Sydney gap).

## Unknown-birth-time convention

When `hour` is omitted, the day pillar is resolved using **local noon** at the birthplace (run
through the same timezone + longitude pipeline as a known time), not the raw input date passed
through untouched — noon minimizes the chance of landing on the wrong side of a date boundary
relative to assuming midnight or a zero offset. The hour pillar itself remains absent
(`timeUnknown: true`).

## Golden test results

All in `src/chart-input/__tests__/international-birth.test.ts`, **22/22 passing**:
- Risk probe (4 tests): both README-exact reproductions, the New York large-correction case, and
  a 6-value longitude probe (-170 to 170) confirming no throw/wraparound.
- Golden cities (5 tests): New York winter (EST) and summer (EDT), London on the BST-start
  boundary day, Berlin (CET), Los Angeles (crosses a calendar day boundary).
- **Seoul 1988 cross-check**: `internationalBirthToSajuChart` via `Asia/Seoul` for a 1988-06-15
  birth inside the historical KDT window produces **pillars identical** to
  `manseryeok-adapter.birthToSajuChart` (the Korea-only path, which uses the hand-rolled
  `KOREA_DST_PERIODS` table) — confirming Node's bundled ICU tzdata reproduces that table exactly
  for this case. Plus an internal-consistency check: the same UTC instant, described via two
  different timezones with the same assumed longitude, yields identical pillars.
- DST gap/ambiguity (4 tests): US spring-forward gap, US fall-back ambiguity, London BST-start
  gap, Sydney (Southern-hemisphere) gap.
- Unknown time (2 tests): local-noon resolution, and a case confirming the resolved date can
  differ from the raw input date when the noon-based correction crosses a day boundary.

## Glossary — entry count and tone

`src/i18n/glossary-en.ts`: **56 entries** across 8 categories — 5 elements, 10 stems, 12 branches,
10 Ten Gods, 12 Twelve Stages, 5 Sinsal, 2 polarities, 4 compatibility tiers (the last of these
was missing from the Phase 0 skeleton — added this phase from `compatibility/types.ts`
`CompatTier`).

**Judgment call — retoned Ten Gods and Sinsal to a "___ Star" naming convention** (e.g. 비견 →
"Peer Star" not "Companion", 역마 → "Traveler's Star" not "Traveling Horse") instead of literal
translations or academic BaZi terms (Rob Wealth, Seven Killings, Hurting Officer) — the target
reader knows her zodiac sign but has never heard of BaZi, so these read as a friendly astrology
placement rather than jargon. Enforced by a dedicated completeness-test assertion that every Ten
God/Sinsal entry matches `/Star'?s?$/`. Stems (Yang Wood, Yin Fire, ...) and branches (Rat,
Tiger, ...) were left as-is — already accessible/zodiac-like, no retone needed.

Completeness (`glossary-en.test.ts`) cross-checks every category against the engine's own runtime
behavior: compile-time exhaustiveness guards (`Record<TenGod | TwelveState | SinsalCode |
CompatTier, true>`) plus exercising `tenGodOf()`/`twelveStateOf()` over every stem/branch
combination and diffing the produced value set against the glossary's keys.

## Deviations / corrections made while reconciling with more detailed guidance

1. **`sanitize.ts` was briefly edited to add `hasCjkLeak`, then reverted.** The verbatim-file rule
   applies to it just as much as any other copied file; `hasCjkLeak` now lives in the new sibling
   `src/reading/sanitize-en.ts` instead. All three consumers (`generate.ts`, `summary.ts`,
   `menus/_generate-section.ts`) import it from there.
2. **`generate.ts`, `summary.ts`, `oracle/index.ts`, and the three menu runners were still wired
   to the Korean `buildChartSummary`** after Phase 0 (the prompt stubs had been swapped to
   English, but the actual chart-summary feed into those prompts had not). Fixed as part of this
   phase's internationalization work — see the file table above.
3. **`internationalBirthToSajuChart`'s DST-resolution algorithm was rewritten mid-phase** after
   testing revealed the first (iterative 2-pass) version couldn't reliably detect genuine
   fall-back ambiguity — see the dedicated section above.
4. **Glossary retone to "___ Star" branding** was not explicitly specified for every single term,
   only demonstrated via two examples (Peer Star, Traveler's Star) — the remaining 8 Ten Gods and
   4 Sinsal names were coined following that pattern and the plain-English glosses already
   present, not translated from any external source.

## Follow-ups for later phases

- `src/reading/character.ts` and `src/reading/chart-summary.ts` remain verbatim (Korean) and are
  not used by the English pipeline (all consumers now use `chart-summary-en.ts`); an English
  character-card equivalent is still open for a later phase.
- `src/compatibility/index.ts` no longer exposes a free tier-teaser string; add an `-en` stub for
  it if the compatibility feature needs a free teaser before its LLM-based menu copy. The new
  `COMPAT_TIER_GLOSSARY` entries are ready for that stub to consume.
- `src/menus/prompts-en.ts` only covers `love-marriage` / `couple` / `career` — add `newyear` /
  `reunion` / `intimacy` specs if/when those runners are ported from the Korean repo.
- `guard.ts`'s school-of-thought hedging rules are still TODO, pending Phase 2's finished prompt
  wording.

## Verification (Phase 1, 2026-07-11)

- `pnpm typecheck` (`tsc --noEmit`): passes, 0 errors.
- `pnpm test` (`vitest run`): **28 test files passed, 194 tests passed, 0 failed.**
