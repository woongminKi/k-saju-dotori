import { describe, it, expect } from 'vitest';
import { tenGodOf } from '../ten-gods';

describe('tenGodOf (일간 기준 상대 천간 십신)', () => {
  it('같은 천간이면 비견 (甲 vs 甲)', () => {
    expect(tenGodOf('甲', '甲')).toBe('비견');
  });
  it('같은 오행 다른 음양이면 겁재 (甲 vs 乙)', () => {
    expect(tenGodOf('甲', '乙')).toBe('겁재');
  });
  it('我生 동음양이면 식신 (甲木 vs 丙火)', () => {
    expect(tenGodOf('甲', '丙')).toBe('식신');
  });
  it('我生 이음양이면 상관 (甲木 vs 丁火)', () => {
    expect(tenGodOf('甲', '丁')).toBe('상관');
  });
  it('我剋 동음양이면 편재 (甲木 vs 戊土)', () => {
    expect(tenGodOf('甲', '戊')).toBe('편재');
  });
  it('我剋 이음양이면 정재 (甲木 vs 己土)', () => {
    expect(tenGodOf('甲', '己')).toBe('정재');
  });
  it('剋我 동음양이면 편관 (甲木 vs 庚金)', () => {
    expect(tenGodOf('甲', '庚')).toBe('편관');
  });
  it('剋我 이음양이면 정관 (甲木 vs 辛金)', () => {
    expect(tenGodOf('甲', '辛')).toBe('정관');
  });
  it('生我 동음양이면 편인 (甲木 vs 壬水)', () => {
    expect(tenGodOf('甲', '壬')).toBe('편인');
  });
  it('生我 이음양이면 정인 (甲木 vs 癸水)', () => {
    expect(tenGodOf('甲', '癸')).toBe('정인');
  });
});
