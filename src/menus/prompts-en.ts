import { SHARED_SYSTEM_BLOCK1 } from '../reading/prompts/frame-en-v1';
import type { LlmSystemBlock } from '../naming-engine/llm';

// Only the menu specs needed by the copied runners (solo uses reading/ modules directly and
// doesn't touch this file; couple/love-marriage/career are the menus wired in Phase 0).
// TODO(Phase 2): add newyear/reunion/intimacy specs when those runners are ported.
export type MenuPromptId = 'love-marriage' | 'couple' | 'career';

interface MenuPromptSpec {
  title: string;
  focus: string;
  extraRules?: string[];
  twoPerson?: boolean;
}

// TODO(Phase 2): re-author focus text with full English guidance (mirrors Korean menus/prompts.ts).
function menuSpec(menu: MenuPromptId): MenuPromptSpec {
  switch (menu) {
    case 'love-marriage':
      return {
        title: 'Love & marriage outlook',
        focus: 'Cover love/marriage tendencies from the spouse stars, Day Branch, and romance stars. [TODO(Phase 2)]',
      };
    case 'couple':
      return {
        title: 'Compatibility',
        twoPerson: true,
        focus: 'Cover compatibility from Day Master/Day Branch relations and element complement. [TODO(Phase 2)]',
      };
    case 'career':
      return {
        title: 'Career & aptitude outlook',
        focus: 'Cover career/aptitude tendencies from Ten Gods and element balance. [TODO(Phase 2)]',
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
Using the [tone] above, output the '${spec.title}' reading body text only.
- No JSON/headers/title/code fences — body text only.
- Do not leak internal scores/probabilities or English key names (e.g. breakdown).
- Do not invent facts absent from ${basis}.${extra}`,
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
