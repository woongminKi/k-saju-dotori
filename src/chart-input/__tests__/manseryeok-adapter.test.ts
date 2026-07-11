// manseryeok-adapter — 출생 정보 → SajuChart 어댑터 테스트.
// 라이브러리(@fullstackfamily/manseryeok)는 결정론적·in-process — 모킹하지 않고 실제 호출.
//
// 검증 포인트:
//   1) README 베이스라인 — 1990-05-15 14:30 Seoul → 庚午/辛巳/庚辰/癸未
//   2) timeUnknown — hour 미입력 시 hour 기둥 없이 timeUnknown=true
//   3) hiddenStems — 모든 기둥에 ki 채워짐, 표준 지장간 표 일치
//   4) DST 보정 — 1948~88 한국 일광절약시간(KOREA_DST_PERIODS) 동안 -1h 적용
//   5) 야자시 — 23:30 → 일주 = 당일
//   6) 입춘 경계 — 1984-02-03 vs -02-04 → 년주 癸亥 → 甲子
//   7) 부산 경도 옵션 — longitude=129 명시
//   8) 범위 가드 — 1899/2051 → throw
import { describe, it, expect } from 'vitest';
import { calculateSaju } from '@fullstackfamily/manseryeok';
import { birthToSajuChart, KOREA_DST_PERIODS } from '../manseryeok-adapter';
import { HIDDEN_STEMS } from '../_element-tables';

describe('manseryeok-adapter: birthToSajuChart', () => {
  // ── 1. README 베이스라인 ──
  it('1990-05-15 14:30 Seoul 기본 옵션 → year=庚午, month=辛巳, day=庚辰, hour=癸未, timeUnknown=false', () => {
    const chart = birthToSajuChart({ year: 1990, month: 5, day: 15, hour: 14, minute: 30 });
    expect(chart.timeUnknown).toBe(false);
    expect(chart.pillars.year).toMatchObject({ stem: '庚', branch: '午' });
    expect(chart.pillars.month).toMatchObject({ stem: '辛', branch: '巳' });
    expect(chart.pillars.day).toMatchObject({ stem: '庚', branch: '辰' });
    expect(chart.pillars.hour).toBeDefined();
    expect(chart.pillars.hour).toMatchObject({ stem: '癸', branch: '未' });
  });

  // ── 2. 시간 미입력 (timeUnknown) ──
  it('hour 미입력 → timeUnknown=true, pillars.hour 없음, 나머지 3주 정상', () => {
    const chart = birthToSajuChart({ year: 1990, month: 5, day: 15 });
    expect(chart.timeUnknown).toBe(true);
    expect(chart.pillars.hour).toBeUndefined();
    expect(chart.pillars.year).toMatchObject({ stem: '庚', branch: '午' });
    expect(chart.pillars.month).toMatchObject({ stem: '辛', branch: '巳' });
    expect(chart.pillars.day).toMatchObject({ stem: '庚', branch: '辰' });
  });

  // ── 3. 지장간 채워짐 ──
  it('모든 기둥에 hiddenStems.ki 가 단일 한자로 채워지고 표준 지장간 표와 일치한다', () => {
    const chart = birthToSajuChart({ year: 1990, month: 5, day: 15, hour: 14, minute: 30 });
    const pillars = [chart.pillars.year, chart.pillars.month, chart.pillars.day, chart.pillars.hour!];
    for (const p of pillars) {
      const expected = HIDDEN_STEMS[p.branch];
      expect(expected).toBeDefined();
      expect(p.hiddenStems.ki).toBe(expected!.ki);
      expect(typeof p.hiddenStems.ki).toBe('string');
      expect(p.hiddenStems.ki).toHaveLength(1);
      // jung/yeo 는 표에 있을 때만 존재, 없으면 undefined
      if (expected!.jung) expect(p.hiddenStems.jung).toBe(expected!.jung);
      else expect(p.hiddenStems.jung).toBeUndefined();
      if (expected!.yeo) expect(p.hiddenStems.yeo).toBe(expected!.yeo);
      else expect(p.hiddenStems.yeo).toBeUndefined();
    }
  });

  // ── 4. DST in range (1988) ──
  it('1988-06-15 03:30 (DST 시행 중) — 어댑터가 -1h 한 후 라이브러리 호출 결과와 일치', () => {
    // 어댑터 결과: DST 보정 후 02:30 → calculateSaju(1988,6,15,2,30) 와 같아야 함
    const chart = birthToSajuChart({ year: 1988, month: 6, day: 15, hour: 3, minute: 30 });
    const oracle = calculateSaju(1988, 6, 15, 2, 30);
    expect(chart.pillars.year).toMatchObject({ stem: oracle.yearPillarHanja[0]!, branch: oracle.yearPillarHanja[1]! });
    expect(chart.pillars.month).toMatchObject({ stem: oracle.monthPillarHanja[0]!, branch: oracle.monthPillarHanja[1]! });
    expect(chart.pillars.day).toMatchObject({ stem: oracle.dayPillarHanja[0]!, branch: oracle.dayPillarHanja[1]! });
    expect(chart.pillars.hour).toMatchObject({ stem: oracle.hourPillarHanja![0]!, branch: oracle.hourPillarHanja![1]! });
  });

  // ── 5. DST 시작 경계 — 1988-05-08 02:00 ──
  it('1988-05-08 01:59 (DST 직전, 보정 없음) ≠ 1988-05-08 02:00 (DST 시작, -1h 적용) — hour 기둥이 달라야 함', () => {
    // 01:59 → 그대로 calculateSaju(1988,5,8,1,59)
    const before = birthToSajuChart({ year: 1988, month: 5, day: 8, hour: 1, minute: 59 });
    const beforeOracle = calculateSaju(1988, 5, 8, 1, 59);
    expect(before.pillars.hour).toMatchObject({ stem: beforeOracle.hourPillarHanja![0]!, branch: beforeOracle.hourPillarHanja![1]! });

    // 02:00 → 어댑터가 -1h → 01:00 으로 calculateSaju 호출
    const after = birthToSajuChart({ year: 1988, month: 5, day: 8, hour: 2, minute: 0 });
    const afterOracle = calculateSaju(1988, 5, 8, 1, 0);
    expect(after.pillars.hour).toMatchObject({ stem: afterOracle.hourPillarHanja![0]!, branch: afterOracle.hourPillarHanja![1]! });

    // 명확히 다른 시각이 되어야 함(02:00 input 은 보정되어 01:00 시각으로 사주 산정 → 01:59 input(보정 32분) 과는 다름)
    expect(after.pillars.hour).not.toEqual(before.pillars.hour);
  });

  // ── 6. DST 종료 경계 — 1987-10-11 03:00 ──
  it('1987-10-11 02:59 (DST 마지막 분, -1h) vs 03:00 (DST 종료, 보정 없음) — 경계 처리 정확', () => {
    // 02:59 → DST 마지막 → -1h → 01:59
    const inside = birthToSajuChart({ year: 1987, month: 10, day: 11, hour: 2, minute: 59 });
    const insideOracle = calculateSaju(1987, 10, 11, 1, 59);
    expect(inside.pillars.hour).toMatchObject({ stem: insideOracle.hourPillarHanja![0]!, branch: insideOracle.hourPillarHanja![1]! });

    // 03:00 → DST 종료(상한 미포함) → 보정 없음 → 그대로 호출
    const outside = birthToSajuChart({ year: 1987, month: 10, day: 11, hour: 3, minute: 0 });
    const outsideOracle = calculateSaju(1987, 10, 11, 3, 0);
    expect(outside.pillars.hour).toMatchObject({ stem: outsideOracle.hourPillarHanja![0]!, branch: outsideOracle.hourPillarHanja![1]! });
  });

  // ── 7. Non-DST year ──
  it('1990-06-15 03:30 (DST 적용 연도 아님) — 보정 없이 그대로 라이브러리 호출', () => {
    const chart = birthToSajuChart({ year: 1990, month: 6, day: 15, hour: 3, minute: 30 });
    const oracle = calculateSaju(1990, 6, 15, 3, 30);
    expect(chart.pillars.hour).toMatchObject({ stem: oracle.hourPillarHanja![0]!, branch: oracle.hourPillarHanja![1]! });
  });

  // ── 8. 야자시 ──
  it('1990-05-15 23:59 야자시 — hour 기둥은 子(자), day 기둥은 당일(15일의 庚辰) 유지', () => {
    const chart = birthToSajuChart({ year: 1990, month: 5, day: 15, hour: 23, minute: 59 });
    expect(chart.pillars.day).toMatchObject({ stem: '庚', branch: '辰' });
    expect(chart.pillars.hour?.branch).toBe('子');
    // 라이브러리 직접 호출과 일관(야자시 관례 검증)
    const oracle = calculateSaju(1990, 5, 15, 23, 59);
    expect(chart.pillars.hour).toMatchObject({ stem: oracle.hourPillarHanja![0]!, branch: oracle.hourPillarHanja![1]! });
  });

  // ── 9. 입춘 ±1시간 → 년주 전환 ──
  it('1984 입춘 경계 — 02-03 23:00 → 년주 癸亥, 02-04 01:00 → 년주 甲子', () => {
    const before = birthToSajuChart({ year: 1984, month: 2, day: 3, hour: 23, minute: 0 });
    expect(before.pillars.year).toMatchObject({ stem: '癸', branch: '亥' });

    const after = birthToSajuChart({ year: 1984, month: 2, day: 4, hour: 1, minute: 0 });
    expect(after.pillars.year).toMatchObject({ stem: '甲', branch: '子' });
  });

  // ── 10. 부산 경도 옵션 ──
  it('1990-05-15 14:00 longitude=129 (부산) — 옵션이 라이브러리로 전달되어 직접 호출 결과와 동일', () => {
    const chart = birthToSajuChart({ year: 1990, month: 5, day: 15, hour: 14, minute: 0, longitude: 129 });
    const oracle = calculateSaju(1990, 5, 15, 14, 0, { longitude: 129 });
    expect(chart.pillars.hour).toMatchObject({ stem: oracle.hourPillarHanja![0]!, branch: oracle.hourPillarHanja![1]! });
  });

  // ── 11. 범위 가드 ──
  it('지원 범위 밖(1899, 2051) → throw "지원 범위 밖"', () => {
    expect(() => birthToSajuChart({ year: 1899, month: 12, day: 31 })).toThrow(/지원 범위 밖/);
    expect(() => birthToSajuChart({ year: 2051, month: 1, day: 1 })).toThrow(/지원 범위 밖/);
  });

  // ── 12. Sanity — 차트 구조 ──
  it('반환 차트 구조 — pillars 키 집합과 timeUnknown 일관성', () => {
    const withHour = birthToSajuChart({ year: 2000, month: 7, day: 4, hour: 10, minute: 0 });
    expect(Object.keys(withHour.pillars).sort()).toEqual(['day', 'hour', 'month', 'year']);
    expect(withHour.timeUnknown).toBe(false);

    const noHour = birthToSajuChart({ year: 2000, month: 7, day: 4 });
    expect(Object.keys(noHour.pillars).sort()).toEqual(['day', 'month', 'year']);
    expect(noHour.timeUnknown).toBe(true);
  });

  // ── 13. KOREA_DST_PERIODS 표 형식 검증 ──
  it('KOREA_DST_PERIODS — 모든 항목이 lexicographic-orderable ISO local 문자열이고 start < end', () => {
    expect(KOREA_DST_PERIODS.length).toBeGreaterThanOrEqual(12);
    for (const { start, end } of KOREA_DST_PERIODS) {
      expect(start).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
      expect(end).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
      expect(start < end).toBe(true);
    }
  });
});
