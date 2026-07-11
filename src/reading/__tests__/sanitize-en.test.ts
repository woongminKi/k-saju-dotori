import { describe, it, expect } from 'vitest';
import { hasCjkLeak } from '../sanitize-en';

describe('hasCjkLeak', () => {
  it('catches hanja leaking into English output', () => {
    expect(hasCjkLeak('Your Day Master is 庚金, a Yang Metal type.')).toBe(true);
  });
  it('catches Hangul leaking into English output', () => {
    expect(hasCjkLeak('당신은 단단한 사람이에요')).toBe(true);
  });
  it('catches a single stray CJK character embedded in an otherwise clean sentence', () => {
    expect(hasCjkLeak('You have a strong 木 element influence this year.')).toBe(true);
  });
  it('catches a stray Hangul Jamo (partial syllable) as well as full syllables', () => {
    expect(hasCjkLeak('This reading felt ㅋㅋ funny to read.')).toBe(true);
  });
  it('passes clean English prose', () => {
    expect(hasCjkLeak('You have a strong Wood element influence this year.')).toBe(false);
  });
  it('passes empty and whitespace-only strings', () => {
    expect(hasCjkLeak('')).toBe(false);
    expect(hasCjkLeak('   ')).toBe(false);
  });
});
