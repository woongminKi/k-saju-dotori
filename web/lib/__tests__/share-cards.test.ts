import { describe, it, expect } from 'vitest';
import { truncateForCard } from '../share-cards';

describe('truncateForCard', () => {
  it('returns short strings unchanged (no ellipsis)', () => {
    expect(truncateForCard('hello there', 40)).toBe('hello there');
    expect(truncateForCard('', 40)).toBe('');
  });

  it('returns a string exactly at the limit unchanged', () => {
    const s = 'x'.repeat(20);
    expect(truncateForCard(s, 20)).toBe(s);
  });

  it('truncates long strings to <= maxChars and appends an ellipsis', () => {
    const s = 'The friend who is still standing after the storm everyone else got blown over by.';
    const out = truncateForCard(s, 40);
    expect(out.length).toBeLessThanOrEqual(40);
    expect(out.endsWith('…')).toBe(true);
  });

  it('breaks on a word boundary rather than mid-word when one is close', () => {
    const out = truncateForCard('alpha beta gamma delta epsilon', 18);
    expect(out.length).toBeLessThanOrEqual(18);
    expect(out.endsWith('…')).toBe(true);
    // Should not leave a chopped-off partial word before the ellipsis.
    const body = out.slice(0, -1);
    expect(['alpha beta', 'alpha beta gamma']).toContain(body.trimEnd());
  });

  it('falls back to a hard cut when there is no reasonable word boundary', () => {
    const out = truncateForCard('supercalifragilisticexpialidocious', 10);
    expect(out.length).toBeLessThanOrEqual(10);
    expect(out.endsWith('…')).toBe(true);
  });
});
