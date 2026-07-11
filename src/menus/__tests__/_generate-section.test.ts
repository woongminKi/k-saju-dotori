import { describe, it, expect } from 'vitest';
import { generateSection } from '../_generate-section';
import { mockLlm } from './_fixtures';

describe('menus/_generate-section', () => {
  it('정상 응답이면 ok:true 와 sanitize 된 본문', async () => {
    const llm = mockLlm(() => '```\nToday carries a strong, steady energy.\n```');
    const sec = await generateSection('lm', '연애·결혼운', '프롬프트', { llm });
    expect(sec).toEqual({ id: 'lm', title: '연애·결혼운', body: 'Today carries a strong, steady energy.', ok: true });
  });

  it('a death/lifespan-prediction guard violation retries and reports ok:false', async () => {
    // English re-creation of the sub-test removed in Phase 0 (deviation #5) — the Korean trigger
    // phrase '곧 죽는다' isn't recognized by the (intentionally English) guard.ts ruleset.
    const llm = mockLlm(() => 'You are going to die next year.');
    const sec = await generateSection('lm', '연애·결혼운', '프롬프트', { llm, moduleRetries: 1 });
    expect(sec.ok).toBe(false);
    expect(sec.body).toBe('');
  });

  it('빈 응답이면 ok:false', async () => {
    const llm = mockLlm(() => '   ');
    const sec = await generateSection('lm', '제목', '프롬프트', { llm, moduleRetries: 0 });
    expect(sec.ok).toBe(false);
  });

  it('system 블록을 넘기면 llm.complete에 options.system으로 전달된다', async () => {
    const calls: Array<{ prompt: string; options?: unknown }> = [];
    const llm = {
      complete: async (prompt: string, options?: unknown) => {
        calls.push({ prompt, options });
        return 'A warm, grounded reading body.';
      },
    };
    const system = [{ type: 'text' as const, text: '블록', cache_control: { type: 'ephemeral' as const } }];
    const section = await generateSection('couple', '궁합', '[사주 요약]\n요약', { llm }, system);
    expect(section.ok).toBe(true);
    expect(calls[0]!.options).toEqual({ system });
  });
});
