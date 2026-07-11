import { describe, it, expect } from 'vitest';
import { buildTeaserEn } from '../teaser-en';
import { hasCjkLeak } from '../../reading/sanitize-en';
import type { MenuSection } from '../types';

describe('menus/teaser-en', () => {
  it('trims a long first-ok-section body to a 120-char preview with an ellipsis', () => {
    const long = 'a'.repeat(200);
    const sections: MenuSection[] = [{ id: 's1', title: 't', body: long, ok: true }];
    const teaser = buildTeaserEn(sections);
    expect(teaser.length).toBeLessThanOrEqual(123); // 120 chars + '...'
    expect(teaser.endsWith('...')).toBe(true);
  });

  it('does not trim a short body', () => {
    const sections: MenuSection[] = [{ id: 's1', title: 't', body: 'a short body', ok: true }];
    expect(buildTeaserEn(sections)).toBe('a short body');
  });

  it('falls back to an English message (not the Korean original) when no section succeeded', () => {
    const sections: MenuSection[] = [{ id: 's1', title: 't', body: '', ok: false }];
    const teaser = buildTeaserEn(sections);
    expect(teaser).toBe('Your reading is still coming together — try again in a moment.');
    expect(hasCjkLeak(teaser)).toBe(false);
  });
});
