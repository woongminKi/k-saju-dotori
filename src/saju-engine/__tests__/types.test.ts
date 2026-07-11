import { describe, it, expect } from 'vitest';
import type { FullSajuChart, TenGod, TwelveState } from '../types';

describe('saju-engine types', () => {
  it('TenGod union은 10종을 허용한다', () => {
    const gods: TenGod[] = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];
    expect(gods).toHaveLength(10);
  });
  it('TwelveState union은 12종을 허용한다', () => {
    const states: TwelveState[] = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'];
    expect(states).toHaveLength(12);
  });
});
