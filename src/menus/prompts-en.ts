// Menu reading prompts — English re-authoring of the Korean menus/prompts.ts for love-marriage,
// couple, and career (solo uses reading/prompts/modules-en.ts directly and doesn't touch this
// file; newyear/reunion/intimacy specs aren't ported yet — see ENGINE_SYNC.md).
import { SHARED_SYSTEM_BLOCK1 } from '../reading/prompts/frame-en-v1';
import type { LlmSystemBlock } from '../naming-engine/llm';

export type MenuPromptId = 'love-marriage' | 'couple' | 'career';

interface MenuPromptSpec {
  title: string;
  focus: string;
  extraRules?: string[];
  twoPerson?: boolean;
}

function menuSpec(menu: MenuPromptId): MenuPromptSpec {
  switch (menu) {
    case 'love-marriage':
      return {
        title: 'Love & Relationship Outlook',
        focus: `This is a love and relationship read based on this person's chart alone. Read from the Wealth Star and Structure/Warrior Star (the traditional partner-indicators), the Day Branch (the relationship palace), and any Charm Star or Romance Star present.
Cover what kind of connection tends to click for this person, and — if the luck pillars suggest it — when a stronger pull toward relationships tends to show up, framed as a season to watch, never a hard date.`,
        extraRules: ['- Never name or imply a specific marriage date or timeframe as a certain outcome.'],
      };
    case 'couple':
      return {
        title: 'Compatibility',
        twoPerson: true,
        focus: `This is a compatibility read comparing two charts. Cover how the two Day Masters relate elementally, how the two Day Branches interact, and where the Ten Gods complement or clash between them.
Skip a flat "good/bad" verdict — instead cover what naturally clicks between them and what's worth being mindful of, in a balanced, two-sided way.`,
      };
    case 'career':
      return {
        title: 'Career & Aptitude Outlook',
        focus: `This is a career and aptitude read based on this person's chart alone. Read from the Ten Gods (especially Structure/Warrior Star, Expression/Maverick Star, and Wealth Star) and the overall element balance.
Cover what kind of work tends to feel natural, what kind of role or environment this person tends to gravitate toward, and the general shape of their financial energy — all as tendency, never a guaranteed outcome.`,
      };
  }
}

/** Static part (system 2-block), same caching structure as reading/prompts/modules-en.ts. */
export function buildMenuSystemBlocks(menu: MenuPromptId): LlmSystemBlock[] {
  const spec = menuSpec(menu);
  const basis = spec.twoPerson ? 'the two summaries' : 'the chart summary';
  const extra = spec.extraRules?.length ? `\n${spec.extraRules.join('\n')}` : '';
  return [
    {
      type: 'text',
      text: SHARED_SYSTEM_BLOCK1,
      cache_control: { type: 'ephemeral' },
    },
    {
      type: 'text',
      text: `[This reading's focus — '${spec.title}']
${spec.focus}

[Output]
Using the voice above, output the '${spec.title}' reading body text only.
- No JSON, no headers, no title, no code fences — body text only.
- Do not leak internal scores/probabilities or key names (e.g. "breakdown").
- Do not invent facts absent from ${basis}.
- English only — no hanja, no Hangul, no romanized Korean terms.${extra}`,
      cache_control: { type: 'ephemeral' },
    },
  ];
}

/** Dynamic part (user) — single-person menus. */
export function buildMenuUserPrompt(summary: string): string {
  return `[Chart summary]\n${summary}`;
}

/** Dynamic part (user) — two-person comparison menus. */
export function buildMenuPairUserPrompt(
  a: string,
  b: string,
  labelA = 'Person 1',
  labelB = 'Person 2',
): string {
  return `[${labelA} chart summary]\n${a}\n\n[${labelB} chart summary]\n${b}`;
}
