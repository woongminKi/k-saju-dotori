import { describe, it, expect } from 'vitest';
import { isYukhap, isChung } from '../branch-relations';

describe('compatibility/branch-relations', () => {
  it('육합 쌍은 순서와 무관하게 true', () => {
    expect(isYukhap('子', '丑')).toBe(true);
    expect(isYukhap('丑', '子')).toBe(true);
    expect(isYukhap('午', '未')).toBe(true);
  });
  it('충 쌍은 순서와 무관하게 true', () => {
    expect(isChung('子', '午')).toBe(true);
    expect(isChung('午', '子')).toBe(true);
    expect(isChung('辰', '戌')).toBe(true);
  });
  it('관계 없는 쌍/동일 지지는 둘 다 false', () => {
    expect(isYukhap('子', '子')).toBe(false);
    expect(isChung('子', '子')).toBe(false);
    expect(isYukhap('子', '寅')).toBe(false);
    expect(isChung('子', '丑')).toBe(false);
  });
});
