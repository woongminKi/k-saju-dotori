import { describe, it, expect } from 'vitest';
import { characterForDayStem, stemCardLabel } from '../character';

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

describe('characterForDayStem', () => {
  it('10개 일간 전수 — 이름/한줄 모두 비어있지 않고 서로 다르다', () => {
    const names = STEMS.map((s) => characterForDayStem(s).name);
    for (const s of STEMS) {
      const c = characterForDayStem(s);
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.line.length).toBeGreaterThan(0);
      expect(c.line.endsWith('요')).toBe(true); // 해요체
    }
    expect(new Set(names).size).toBe(10);
  });

  it('알 수 없는 천간은 폴백 캐릭터', () => {
    const c = characterForDayStem('?');
    expect(c.name).toBe('신비로운 도토리형');
    expect(c.line.length).toBeGreaterThan(0);
  });
});

describe('stemCardLabel', () => {
  it('한자 천간 → "한글(오행한자) 일간"', () => {
    expect(stemCardLabel('甲')).toBe('갑(木) 일간');
    expect(stemCardLabel('癸')).toBe('계(水) 일간');
  });
  it('알 수 없는 천간은 "일간 미상"', () => {
    expect(stemCardLabel('?')).toBe('일간 미상');
  });
});
