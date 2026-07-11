import { describe, it, expect } from 'vitest';
import { sanitizeBody, hasRawLeak, hasCjkLeak } from '../sanitize';

describe('sanitizeBody', () => {
  it('코드펜스를 벗긴다', () => {
    expect(sanitizeBody('```\n본문임\n```')).toBe('본문임');
    expect(sanitizeBody('```json\n본문임\n```')).toBe('본문임');
  });
  it('{"body": "..."} JSON 래퍼를 벗긴다', () => {
    expect(sanitizeBody('{"body": "엮은 본문임"}')).toBe('엮은 본문임');
  });
  it('평범한 텍스트는 trim 만 한다', () => {
    expect(sanitizeBody('  그냥 본문임  ')).toBe('그냥 본문임');
  });
});

describe('hasRawLeak', () => {
  it('0.85 같은 내부 점수 노출을 잡는다', () => {
    expect(hasRawLeak('적합도 0.85 정도임')).toBe(true);
  });
  it('영문 내부 키 노출을 잡는다', () => {
    expect(hasRawLeak('breakdown 은 다음과 같음')).toBe(true);
  });
  it('깨끗한 음슴체 본문은 통과', () => {
    expect(hasRawLeak('庚金 일간이라 단단하고 결단력 있는 편임')).toBe(false);
  });
  it('평범한 산문 속 소수(점수 라벨 없음)는 누출로 보지 않는다', () => {
    expect(hasRawLeak('체력이 7.25배쯤 좋아지는 느낌임')).toBe(false);
  });
});

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
  it('passes clean English prose', () => {
    expect(hasCjkLeak('You have a strong Wood element influence this year.')).toBe(false);
  });
});
