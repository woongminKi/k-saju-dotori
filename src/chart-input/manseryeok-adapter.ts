// manseryeok-adapter — 출생 정보 → SajuChart 어댑터.
//   @fullstackfamily/manseryeok 의 calculateSaju() 출력(년·월·일·시주 한자 2자 문자열)을
//   spec 의 SajuChart{pillars:{year,month,day,hour?},timeUnknown} 로 변환한다.
//   진태양시 보정은 라이브러리가 처리(기본 ON, 경도 입력으로 지역 보정).
//   1948~88 한국 일광절약시간(KDT)은 라이브러리가 처리하지 않으므로, 호출 전 -1시간 보정을 우리가 적용.
//   지장간(hiddenStems)은 _element-tables.HIDDEN_STEMS 로 보강.
//
// 적용 관례 (PRD `2026-05-13-data-layer-decisions.md` §2.1.4):
//   - 자시: 라이브러리가 야자시/조자시 분리 처리(23:00~24:00 = 당일 일주).
//   - 절기 월주: 라이브러리가 동경 135도 입절 기준.
//   - 진태양시: applyTimeCorrection=true (기본).
//   - DST: 본 어댑터의 KOREA_DST_PERIODS 룩업으로 처리.
import { calculateSaju } from '@fullstackfamily/manseryeok';
import { HIDDEN_STEMS } from './_element-tables';
import type { Pillar, SajuChart } from './types';

export interface BirthInput {
  /** 양력 연도 (1900~2050). */
  year: number;
  /** 양력 월 1~12. */
  month: number;
  /** 양력 일 1~31. */
  day: number;
  /** 양력 시 0~23. 미입력 시 시주 없이 timeUnknown=true. */
  hour?: number;
  /** 분 0~59. 기본 0. */
  minute?: number;
  /** 출생지 경도(도). 기본 127 (서울). 진태양시 보정에 사용. */
  longitude?: number;
  /** 진태양시 보정 적용 여부. 기본 true. */
  applyTimeCorrection?: boolean;
}

/**
 * 한국 일광절약시간(KDT) 적용 기간 — 출생 시각이 이 범위 안이면 -1시간 보정 후 만세력 호출.
 * 출처: 한국어 위키백과 "일광 절약 시간제"(https://ko.wikipedia.org/wiki/일광_절약_시간제) — 2026-05-13 확인.
 * 표기: [시작 UTC+9, 끝 UTC+9) — 끝 시각은 KDT가 KST로 되돌아간 순간(상한 미포함).
 */
export const KOREA_DST_PERIODS: ReadonlyArray<{ start: string; end: string }> = [
  // 1948–1951 — 종료는 9월 둘째 일요일 00:00 관례
  { start: '1948-06-01T00:00', end: '1948-09-13T00:00' },
  { start: '1949-04-03T00:00', end: '1949-09-11T00:00' },
  { start: '1950-04-01T00:00', end: '1950-09-10T00:00' },
  { start: '1951-05-06T00:00', end: '1951-09-09T00:00' },
  // 1955–1960
  { start: '1955-05-05T00:00', end: '1955-09-09T00:00' },
  { start: '1956-05-20T00:00', end: '1956-09-30T00:00' },
  { start: '1957-05-05T00:00', end: '1957-09-22T00:00' },
  { start: '1958-05-04T00:00', end: '1958-09-21T00:00' },
  { start: '1959-05-03T00:00', end: '1959-09-20T00:00' },
  { start: '1960-05-01T00:00', end: '1960-09-18T00:00' },
  // 1987–1988 (서울 올림픽 — 봄 02:00→03:00, 가을 03:00→02:00)
  { start: '1987-05-10T02:00', end: '1987-10-11T03:00' },
  { start: '1988-05-08T02:00', end: '1988-10-09T03:00' },
];

/** 로컬 시각을 lexicographically-orderable ISO 문자열로 (타임존 없음 — 한국 표준시로 가정). */
function isoLocal(y: number, m: number, d: number, h: number, mi: number): string {
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${y}-${p2(m)}-${p2(d)}T${p2(h)}:${p2(mi)}`;
}

function inDstPeriod(year: number, month: number, day: number, hour: number, minute: number): boolean {
  if (year < 1948 || year > 1988) return false;
  const t = isoLocal(year, month, day, hour, minute);
  return KOREA_DST_PERIODS.some(({ start, end }) => t >= start && t < end);
}

/**
 * DST 기간이면 시각을 한 시간 뒤로 (= 시계가 1시간 빨라져 있던 걸 원상복귀). 일 경계 넘으면 day/month/year 까지 롤백.
 *   ⚠️ Date 객체를 쓰면 안 됨 — 실행 환경의 tz 가 `Asia/Seoul` 이고 해당 시각이 historical DST 라면
 *   `new Date(1988,4,8,2,0)` 가 03:00 으로 자동 보정되어 비결정성 발생. 순수 산술로 처리.
 */
function adjustForDst(input: { year: number; month: number; day: number; hour: number; minute: number }) {
  if (!inDstPeriod(input.year, input.month, input.day, input.hour, input.minute)) return input;
  // 시각만 -1 — 양수면 그대로, 0 이면 23시 + 전날로 롤백
  if (input.hour > 0) {
    return { ...input, hour: input.hour - 1 };
  }
  // hour === 0 → 전날 23:xx 로 (UTC 사용해 안전하게 일/월/년 롤백)
  const utc = Date.UTC(input.year, input.month - 1, input.day) - 24 * 3600 * 1000;
  const prev = new Date(utc);
  return {
    year: prev.getUTCFullYear(),
    month: prev.getUTCMonth() + 1,
    day: prev.getUTCDate(),
    hour: 23,
    minute: input.minute,
  };
}

function pillarFromHanja(p: string): Pillar {
  // 한자 2자: 첫 자 = 천간, 둘째 자 = 지지.
  const stem = p[0]!;
  const branch = p[1]!;
  const hs = HIDDEN_STEMS[branch];
  if (!hs) throw new Error(`manseryeok-adapter: 알 수 없는 지지 '${branch}' — HIDDEN_STEMS 누락`);
  return { stem, branch, hiddenStems: hs };
}

/**
 * 출생 입력 → SajuChart. 라이브러리 범위(1900~2050) 밖이면 throw.
 * - hour 미입력 → 시주 없이 timeUnknown=true.
 * - hour 입력 → DST 보정 + 진태양시 보정(라이브러리) 후 시주 산정.
 */
export function birthToSajuChart(input: BirthInput): SajuChart {
  if (input.year < 1900 || input.year > 2050) {
    throw new Error(`manseryeok-adapter: 지원 범위 밖 (1900~2050): ${input.year}`);
  }
  const timeUnknown = input.hour === undefined;
  const longitude = input.longitude ?? 127;
  const applyTimeCorrection = input.applyTimeCorrection ?? true;

  if (timeUnknown) {
    // 시 없이 호출 → hourPillar null. 사주 4기둥 중 시주만 빠진 형태.
    const r = calculateSaju(input.year, input.month, input.day, undefined, undefined, { longitude, applyTimeCorrection });
    return {
      pillars: {
        year: pillarFromHanja(r.yearPillarHanja),
        month: pillarFromHanja(r.monthPillarHanja),
        day: pillarFromHanja(r.dayPillarHanja),
      },
      timeUnknown: true,
    };
  }

  const adj = adjustForDst({ year: input.year, month: input.month, day: input.day, hour: input.hour!, minute: input.minute ?? 0 });
  const r = calculateSaju(adj.year, adj.month, adj.day, adj.hour, adj.minute, { longitude, applyTimeCorrection });
  if (!r.hourPillarHanja) throw new Error('manseryeok-adapter: 시 입력 있으나 hourPillar null — 라이브러리 응답 비정상');
  return {
    pillars: {
      year: pillarFromHanja(r.yearPillarHanja),
      month: pillarFromHanja(r.monthPillarHanja),
      day: pillarFromHanja(r.dayPillarHanja),
      hour: pillarFromHanja(r.hourPillarHanja),
    },
    timeUnknown: false,
  };
}
