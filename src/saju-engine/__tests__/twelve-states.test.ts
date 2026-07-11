import { describe, it, expect } from 'vitest';
import { twelveStateOf } from '../twelve-states';

describe('twelveStateOf (일간 기준 지지 12운성)', () => {
  it('甲(양목)은 亥에서 장생', () => {
    expect(twelveStateOf('甲', '亥')).toBe('장생');
  });
  it('甲은 子에서 목욕 (양간 순행)', () => {
    expect(twelveStateOf('甲', '子')).toBe('목욕');
  });
  it('甲은 卯에서 제왕', () => {
    expect(twelveStateOf('甲', '卯')).toBe('제왕');
  });
  it('乙(음목)은 午에서 장생', () => {
    expect(twelveStateOf('乙', '午')).toBe('장생');
  });
  it('乙은 巳에서 목욕 (음간 역행)', () => {
    expect(twelveStateOf('乙', '巳')).toBe('목욕');
  });
  it('庚(양금)은 巳에서 장생', () => {
    expect(twelveStateOf('庚', '巳')).toBe('장생');
  });
  it('알 수 없는 천간은 throw', () => {
    expect(() => twelveStateOf('X', '子')).toThrow();
  });
});
