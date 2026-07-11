// Content safety — blocks fatalistic death/lifespan predictions, terminal-illness assertions,
//   and self-harm content from reading output. English rewrite of the Korean guard.ts; same
//   {safe, reason?} contract so callers (generate.ts, summary.ts, menus/_generate-section.ts)
//   are unaffected.
// Phase 1: broadened each of the 3 categories to cover the common English phrasings an LLM is
//   likely to produce, matching (and exceeding, for self-harm) the 2-category Korean original's
//   intent: block certain-death/lifespan claims and certain-terminal-illness claims outright.
// TODO(Phase 2): add school-of-thought hedging rules once the English prompt content
//   (frame-en-v1/modules-en/menus prompts-en) is finalized — those rules depend on the exact
//   hedge language the finished prompts instruct the model to use.

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
];

export function checkContentSafety(text: string): { safe: boolean; reason?: string } {
  for (const rule of UNSAFE_RULES) {
    if (rule.re.test(text)) return { safe: false, reason: rule.reason };
  }
  return { safe: true };
}
