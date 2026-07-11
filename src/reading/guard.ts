// Content safety — blocks fatalistic death/lifespan predictions, terminal-illness assertions,
//   self-harm content, and definitive medical/pregnancy/legal/financial-guarantee claims from
//   reading output. English rewrite of the Korean guard.ts (authored in Phase 1); same
//   {safe, reason?} contract so callers (generate.ts, summary.ts, menus/_generate-section.ts)
//   are unaffected.
// Phase 1: broadened the original 2 Korean categories (death/lifespan, terminal illness) to cover
//   the common English phrasings an LLM is likely to produce, kept + broadened the self-harm
//   category (not present in the Korean original), and added a 4th category blocking definitive
//   medical/pregnancy/legal/financial-guarantee claims ("you will definitely win the lawsuit",
//   "guaranteed to get pregnant in...") — a Saju reading should never read as a certain diagnosis,
//   legal outcome, or financial promise.
// Phase 2: added the school-of-thought hedging rule below, now that frame-en-v1.ts's
//   FRAME_V1_CATALOG exists and tags each interpretation pattern's reliability (high/mid/low).
//   Sinsal, Twelve-Stage, and branch-connection reads are explicitly mid/low-confidence,
//   school-dependent material in the prompt's own instructions (see modules-en.ts's sinsal and
//   hapchung focus text) — this rule catches the model asserting them with unhedged, absolute
//   certainty instead of the "tends to", "some chart-readers would say" framing the prompts ask
//   for.

interface UnsafeRule {
  re: RegExp;
  reason: string;
}

const UNSAFE_RULES: UnsafeRule[] = [
  // ── Death / lifespan predictions — certain, unhedged claims about dying or how long someone
  //    has left. Deliberately does NOT block softer, hedged phrasing like "you may want to be
  //    careful with your health this year" — that's exactly the kind of hedge Phase 2's prompts
  //    should be instructed to prefer instead.
  {
    re: /\b(you('re| are) going to die|you will die|your death is (near|imminent)|you will not survive|you won'?t survive|you're not going to make it|(you have|you'?ve got) (only )?\d+ (more )?(days?|weeks?|months?|years?) (left|to live)|you don'?t have (long|much time) (left|to live)|fated to die|destined to die young)\b/i,
    reason: 'death/lifespan prediction',
  },
  // ── Terminal illness / severe illness assertions — stated as fact, not as a possibility to
  //    watch for.
  {
    re: /\b(you have (a )?terminal (illness|disease)|(your )?illness (is|will be) (fatal|terminal)|incurable disease|you (have|will get) cancer|you('re| are) dying (of|from)|diagnosed with a fatal)\b/i,
    reason: 'terminal illness assertion',
  },
  // ── Self-harm — not present in the Korean original (which predates this concern in-app); kept
  //    and broadened here since it's an unconditional safety requirement for any user-facing
  //    English reading product.
  {
    re: /\b(kill yourself|end your (own )?life|self[- ]harm|hurt yourself|take your (own )?life|you should die|better off dead)\b/i,
    reason: 'self-harm content',
  },
  // ── Definitive medical / pregnancy / legal / financial-guarantee claims — a reading should
  //    never present itself as a certain diagnosis, guaranteed legal outcome, or promised
  //    financial result. Hedged language ("this could be a good year to...") is fine; only the
  //    unconditional "will definitely / guaranteed to" framing is blocked.
  {
    re: /\b(you will definitely (win|lose) (the |your )?(lawsuit|case|trial)|guaranteed to (win|lose) (the |your )?(lawsuit|case)|you will definitely get pregnant|guaranteed to (get|become) pregnant|guaranteed pregnancy|you are definitely (pregnant|infertile)|you will (never|definitely never) (be able to )?(have|conceive) (a )?child(ren)?|guaranteed to (win|make) (millions|a fortune)|guaranteed (return|profit|riches)|you will definitely (be rich|become wealthy))\b/i,
    reason: 'definitive medical/pregnancy/legal/financial-guarantee claim',
  },
  // ── School-of-thought hedging — Sinsal, Twelve-Stage, and branch-connection reads are
  //    explicitly mid/low-confidence, interpretation-dependent material (per FRAME_V1_CATALOG and
  //    the sinsal/hapchung module focus text). Blocks the model stating them with unhedged,
  //    absolute certainty ("this always means...", "this proves...", "there is no doubt...")
  //    instead of the tendency-framed hedge language the prompts instruct it to use. Deliberately
  //    narrow — ordinary confident statements about high-confidence patterns ("you're clearly a
  //    Yang Wood type") are NOT blocked; only totalizing "always/never/proves/no doubt" framing is.
  {
    re: /\b(this (always|never) means|this (chart )?proves|there is no doubt|without (a )?doubt you will|without question you will|this (chart )?guarantees|this is (definitely|certainly) the (one|only) (interpretation|explanation)|no other explanation is possible)\b/i,
    reason: 'unhedged absolute claim on interpretation-dependent material',
  },
];

export function checkContentSafety(text: string): { safe: boolean; reason?: string } {
  for (const rule of UNSAFE_RULES) {
    if (rule.re.test(text)) return { safe: false, reason: rule.reason };
  }
  return { safe: true };
}
