// English guard.ts tests — the Korean guard.test.ts was dropped in Phase 0 because it asserted
// Korean-language trigger phrases against what is now an intentionally English ruleset (see
// K-saju/ENGINE_SYNC.md). This is the from-scratch English replacement.
import { describe, it, expect } from 'vitest';
import { checkContentSafety } from '../guard';

describe('checkContentSafety — death/lifespan predictions', () => {
  it.each([
    'You are going to die next year.',
    'Your death is imminent according to this chart.',
    'You will not survive the winter.',
    "You've got 3 months left.",
    'You don\'t have long to live.',
    'You are fated to die young.',
  ])('blocks: "%s"', (text) => {
    const r = checkContentSafety(text);
    expect(r.safe).toBe(false);
    expect(r.reason).toBe('death/lifespan prediction');
  });
});

describe('checkContentSafety — terminal illness assertions', () => {
  it.each([
    'You have a terminal illness coming.',
    'Your illness will be fatal.',
    'This chart shows an incurable disease.',
    'You will get cancer this decade.',
    'You are dying from an illness no one can name.',
  ])('blocks: "%s"', (text) => {
    const r = checkContentSafety(text);
    expect(r.safe).toBe(false);
    expect(r.reason).toBe('terminal illness assertion');
  });
});

describe('checkContentSafety — self-harm content', () => {
  it.each([
    'Maybe you should just kill yourself.',
    'It might be time to end your life.',
    'You would be better off dead.',
  ])('blocks: "%s"', (text) => {
    const r = checkContentSafety(text);
    expect(r.safe).toBe(false);
    expect(r.reason).toBe('self-harm content');
  });
});

describe('checkContentSafety — hedged, non-fatalistic phrasing passes', () => {
  it.each([
    'You may want to take extra care of your health this year.',
    'This period calls for some caution around your wellbeing.',
    'Your energy could feel a bit low this season — rest when you can.',
    'This is a demanding season for your career, not your health.',
    'Watch your stress levels, but there is nothing alarming here.',
  ])('allows: "%s"', (text) => {
    expect(checkContentSafety(text)).toEqual({ safe: true });
  });
});
