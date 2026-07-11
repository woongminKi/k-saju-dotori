import { describe, it, expect } from 'vitest';
import { stemPolarity, branchIndex } from '../_stem-branch';

describe('_stem-branch', () => {
  it('양간은 甲丙戊庚壬', () => {
    for (const s of ['甲', '丙', '戊', '庚', '壬']) expect(stemPolarity(s)).toBe('양');
  });
  it('음간은 乙丁己辛癸', () => {
    for (const s of ['乙', '丁', '己', '辛', '癸']) expect(stemPolarity(s)).toBe('음');
  });
  it('branchIndex: 子=0 … 亥=11', () => {
    expect(branchIndex('子')).toBe(0);
    expect(branchIndex('亥')).toBe(11);
  });
  it('알 수 없는 천간은 throw', () => {
    expect(() => stemPolarity('X')).toThrow();
  });
});
