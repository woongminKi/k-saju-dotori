// Prompt-shape tests — English re-creation of the Korean prompts-shared-block.test.ts (dropped
// in Phase 0 since it asserted the Korean SHARED_SYSTEM_BLOCK1 text verbatim), extended per the
// Phase 2 spec to also check version strings and the menu-prompt cache contract.
import { describe, it, expect } from 'vitest';
import { SHARED_SYSTEM_BLOCK1, TONE_BLOCK, LENGTH_BLOCK, FRAME_V1_CATALOG, READING_PROMPT_VERSION } from '../prompts/frame-en-v1';
import { buildModuleSystemBlocks } from '../prompts/modules-en';
import { TEASER_PROMPT_VERSION } from '../prompts/teaser-en';
import { buildMenuSystemBlocks } from '../../menus/prompts-en';
import { ORACLE_PROMPT_VERSION } from '../../oracle/prompt-en';

describe('SHARED_SYSTEM_BLOCK1', () => {
  it('is composed of role + TONE + LENGTH + FRAME, and is byte-identical across every module block1', () => {
    expect(SHARED_SYSTEM_BLOCK1).toContain('You are Dotori');
    expect(SHARED_SYSTEM_BLOCK1).toContain(TONE_BLOCK);
    expect(SHARED_SYSTEM_BLOCK1).toContain(LENGTH_BLOCK);
    expect(SHARED_SYSTEM_BLOCK1).toContain(FRAME_V1_CATALOG);
    expect(buildModuleSystemBlocks('ilgan')[0]!.text).toBe(SHARED_SYSTEM_BLOCK1);
    expect(buildModuleSystemBlocks('overall')[0]!.text).toBe(SHARED_SYSTEM_BLOCK1);
    expect(buildModuleSystemBlocks('sinsal')[0]!.text).toBe(SHARED_SYSTEM_BLOCK1);
  });

  it('is byte-identical across every menu prompt block1 too — cross-prompt caching contract', () => {
    // solo (reading modules) and menus (couple/love-marriage/career) must share the exact same
    // block1 text for Anthropic prompt caching to hit across both — this is the contract
    // buildMenuSystemBlocks/buildModuleSystemBlocks both promise not to break.
    expect(buildMenuSystemBlocks('couple')[0]!.text).toBe(SHARED_SYSTEM_BLOCK1);
    expect(buildMenuSystemBlocks('love-marriage')[0]!.text).toBe(SHARED_SYSTEM_BLOCK1);
    expect(buildMenuSystemBlocks('career')[0]!.text).toBe(SHARED_SYSTEM_BLOCK1);
  });

  it('every block1 carries a cache_control marker', () => {
    expect(buildModuleSystemBlocks('ilgan')[0]!.cache_control).toEqual({ type: 'ephemeral' });
    expect(buildMenuSystemBlocks('career')[0]!.cache_control).toEqual({ type: 'ephemeral' });
  });
});

describe('prompt version strings', () => {
  it('every version string is present and distinct from its Phase-0 stub value', () => {
    for (const v of [READING_PROMPT_VERSION, TEASER_PROMPT_VERSION, ORACLE_PROMPT_VERSION]) {
      expect(v.length).toBeGreaterThan(0);
      expect(v).not.toMatch(/stub/i);
    }
  });

  it('version strings are mutually distinct (each prompt file owns its own version)', () => {
    const versions = [READING_PROMPT_VERSION, TEASER_PROMPT_VERSION, ORACLE_PROMPT_VERSION];
    expect(new Set(versions).size).toBe(versions.length);
  });
});
