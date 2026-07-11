import { describe, it, expect } from 'vitest';
import { daewoonDirection, daewoonSteps } from '../daewoon';

describe('daewoon', () => {
  it('년간 양 + 남자 → 순행', () => {
    expect(daewoonDirection('甲', '남')).toBe(true);
  });
  it('년간 양 + 여자 → 역행', () => {
    expect(daewoonDirection('甲', '여')).toBe(false);
  });
  it('년간 음 + 여자 → 순행', () => {
    expect(daewoonDirection('乙', '여')).toBe(true);
  });
  it('순행: 월주 甲子 다음은 乙丑, 丙寅 …', () => {
    const steps = daewoonSteps('甲子', true, 3, 8);
    expect(steps).toHaveLength(8);
    expect(steps.slice(0, 3)).toEqual([
      { age: 3, stem: '乙', branch: '丑' },
      { age: 13, stem: '丙', branch: '寅' },
      { age: 23, stem: '丁', branch: '卯' },
    ]);
  });
  it('역행: 월주 甲子 이전은 癸亥, 壬戌 …', () => {
    const steps = daewoonSteps('甲子', false, 5, 8);
    expect(steps).toHaveLength(8);
    expect(steps.slice(0, 3)).toEqual([
      { age: 5, stem: '癸', branch: '亥' },
      { age: 15, stem: '壬', branch: '戌' },
      { age: 25, stem: '辛', branch: '酉' },
    ]);
  });
});
