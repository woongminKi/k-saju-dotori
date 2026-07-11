// international-birth — golden tests across timezones/longitudes, cross-validated three ways:
//   (1) against calculateSaju() called directly with hand-derived, hand-rolled-forward values,
//   (2) internal consistency — the same real-world instant entered via two different timezones
//       must yield identical pillars,
//   (3) the historical Seoul-1988 case against the Korea-only manseryeok-adapter path.
import { describe, it, expect } from 'vitest';
import { calculateSaju } from '@fullstackfamily/manseryeok';
import { internationalBirthToSajuChart } from '../international-birth';
import { birthToSajuChart } from '../manseryeok-adapter';

/**
 * Test oracle: reproduces internationalBirthToSajuChart's own pipeline (local -> UTC via a fixed
 * offset -> +9h KST-equivalent -> (longitude-135)*4 min correction -> calculateSaju with
 * applyTimeCorrection:false) using an explicitly-supplied UTC offset in minutes instead of an
 * IANA zone lookup, so each golden case's expected value is independently hand-computable and
 * doesn't merely re-exercise international-birth.ts's own timezone-resolution code.
 * (Per the risk-probe finding, calculateSaju's own applyTimeCorrection:true path is only used
 * as an oracle for the two worked README examples, which are Korea-scale corrections — it is
 * unsafe for any of the international-scale corrections exercised elsewhere in this file.)
 */
function oracle(
  year: number, month: number, day: number, hour: number, minute: number,
  utcOffsetMinutes: number, longitude: number,
) {
  const utc = Date.UTC(year, month - 1, day, hour, minute) - utcOffsetMinutes * 60000;
  const kst = utc + 9 * 3600 * 1000;
  const corrected = new Date(kst + (longitude - 135) * 4 * 60000);
  return calculateSaju(
    corrected.getUTCFullYear(), corrected.getUTCMonth() + 1, corrected.getUTCDate(),
    corrected.getUTCHours(), corrected.getUTCMinutes(),
    { applyTimeCorrection: false },
  );
}

function expectPillarsMatch(chart: ReturnType<typeof internationalBirthToSajuChart>, o: ReturnType<typeof oracle>) {
  expect(chart.pillars.year).toMatchObject({ stem: o.yearPillarHanja[0]!, branch: o.yearPillarHanja[1]! });
  expect(chart.pillars.month).toMatchObject({ stem: o.monthPillarHanja[0]!, branch: o.monthPillarHanja[1]! });
  expect(chart.pillars.day).toMatchObject({ stem: o.dayPillarHanja[0]!, branch: o.dayPillarHanja[1]! });
  if (o.hourPillarHanja) {
    expect(chart.pillars.hour).toMatchObject({ stem: o.hourPillarHanja[0]!, branch: o.hourPillarHanja[1]! });
  }
}

// Fixed UTC offsets (minutes) for the zones/seasons exercised below.
const EST = -300; // America/New_York, winter
const EDT = -240; // America/New_York, summer / DST
const PST = -480; // America/Los_Angeles, winter (standard time)
const BST = 60; // Europe/London, summer / DST
const CET = 60; // Europe/Berlin, winter (standard time)
const AEDT = 660; // Australia/Sydney, DST (Southern-hemisphere summer)

describe('internationalBirthToSajuChart — risk probe: longitude behavior', () => {
  it("reproduces calculateSaju's own worked README example exactly: Seoul 127°, 1990-05-15 14:30 -> 13:58 corrected", () => {
    // Seoul, UTC+9, no DST in 1990 -> KST-equivalent reading equals the local reading directly.
    const chart = internationalBirthToSajuChart({
      year: 1990, month: 5, day: 15, hour: 14, minute: 30, timeZone: 'Asia/Seoul', longitude: 127,
    });
    const direct = calculateSaju(1990, 5, 15, 14, 30, { longitude: 127, applyTimeCorrection: true });
    expectPillarsMatch(chart, direct);
  });

  it("reproduces calculateSaju's own worked README example exactly: Busan 129°, 1990-05-15 14:00 -> 13:36 corrected", () => {
    const chart = internationalBirthToSajuChart({
      year: 1990, month: 5, day: 15, hour: 14, minute: 0, timeZone: 'Asia/Seoul', longitude: 129,
    });
    const direct = calculateSaju(1990, 5, 15, 14, 0, { longitude: 129, applyTimeCorrection: true });
    expectPillarsMatch(chart, direct);
  });

  it("a large (New York-scale) longitude correction actually shifts the chart, unlike calculateSaju's own broken large-offset path", () => {
    // Documented finding: calculateSaju's built-in longitude correction only performs a single
    // ±1h borrow and never rolls the date, so it silently no-ops for corrections beyond ~1h
    // (verified: identical hourPillar from longitude 127 down to -170 when called directly).
    // Our own pre-corrected path must NOT exhibit that bug.
    const chart = internationalBirthToSajuChart({
      year: 2024, month: 6, day: 15, hour: 12, minute: 0, timeZone: 'UTC', longitude: -74.006,
    });
    const noCorrection = calculateSaju(2024, 6, 15, 12, 0, { applyTimeCorrection: false });
    expect(chart.pillars.day).not.toEqual({ stem: noCorrection.dayPillarHanja[0], branch: noCorrection.dayPillarHanja[1] });
    expect(chart.pillars.hour).not.toEqual({ stem: noCorrection.hourPillarHanja![0], branch: noCorrection.hourPillarHanja![1] });
    // And it must match our own independently-computed oracle exactly (UTC zone => offset 0).
    expectPillarsMatch(chart, oracle(2024, 6, 15, 12, 0, 0, -74.006));
  });

  it.each([-170, -74.006, -0.1276, 13.405, 127, 170])(
    'longitude=%d does not throw and produces a well-formed 4-pillar chart',
    (longitude) => {
      const chart = internationalBirthToSajuChart({
        year: 2010, month: 6, day: 10, hour: 12, minute: 0, timeZone: 'UTC', longitude,
      });
      expect(chart.timeUnknown).toBe(false);
      expect(Object.keys(chart.pillars).sort()).toEqual(['day', 'hour', 'month', 'year']);
      for (const p of Object.values(chart.pillars)) {
        expect(p!.stem).toMatch(/^.$/);
        expect(p!.branch).toMatch(/^.$/);
        expect(p!.hiddenStems.ki).toMatch(/^.$/);
      }
    },
  );
});

describe('internationalBirthToSajuChart — golden city tests', () => {
  it('New York, winter (EST, UTC-5): 2024-01-15 08:00', () => {
    const chart = internationalBirthToSajuChart({
      year: 2024, month: 1, day: 15, hour: 8, minute: 0, timeZone: 'America/New_York', longitude: -74.006,
    });
    expectPillarsMatch(chart, oracle(2024, 1, 15, 8, 0, EST, -74.006));
  });

  it('New York, summer (EDT, UTC-4): 2024-07-15 08:00', () => {
    const chart = internationalBirthToSajuChart({
      year: 2024, month: 7, day: 15, hour: 8, minute: 0, timeZone: 'America/New_York', longitude: -74.006,
    });
    expectPillarsMatch(chart, oracle(2024, 7, 15, 8, 0, EDT, -74.006));
  });

  it('London, on the BST-start boundary day: 2024-03-31 04:00 (after the 01:00->02:00 gap, so BST/UTC+1)', () => {
    const chart = internationalBirthToSajuChart({
      year: 2024, month: 3, day: 31, hour: 4, minute: 0, timeZone: 'Europe/London', longitude: -0.1276,
    });
    expectPillarsMatch(chart, oracle(2024, 3, 31, 4, 0, BST, -0.1276));
  });

  it('Berlin: 2024-03-01 06:00 (CET, UTC+1)', () => {
    const chart = internationalBirthToSajuChart({
      year: 2024, month: 3, day: 1, hour: 6, minute: 0, timeZone: 'Europe/Berlin', longitude: 13.405,
    });
    expectPillarsMatch(chart, oracle(2024, 3, 1, 6, 0, CET, 13.405));
  });

  it('Los Angeles, standard time (PST, UTC-8): 1999-11-20 23:45 (crosses a calendar day boundary)', () => {
    const chart = internationalBirthToSajuChart({
      year: 1999, month: 11, day: 20, hour: 23, minute: 45, timeZone: 'America/Los_Angeles', longitude: -118.2437,
    });
    expectPillarsMatch(chart, oracle(1999, 11, 20, 23, 45, PST, -118.2437));
  });
});

describe('internationalBirthToSajuChart — Seoul 1988 cross-check against the Korea-only adapter', () => {
  it('Seoul 1988-06-15 14:30 (inside the historical KDT window) matches manseryeok-adapter.birthToSajuChart exactly', () => {
    const intl = internationalBirthToSajuChart({
      year: 1988, month: 6, day: 15, hour: 14, minute: 30, timeZone: 'Asia/Seoul', longitude: 127,
    });
    const domestic = birthToSajuChart({ year: 1988, month: 6, day: 15, hour: 14, minute: 30 });
    expect(intl.pillars).toEqual(domestic.pillars);
    expect(intl.timeUnknown).toBe(domestic.timeUnknown);
  });

  it('internal consistency: the same real-world instant, described via two different timezones with the same longitude, yields identical pillars', () => {
    // 2024-06-15 12:00 UTC is 21:00 in Asia/Tokyo (UTC+9, no DST) and 13:00 in Europe/London
    // (BST, UTC+1) — confirmed via Intl directly below. Describing that SAME instant through
    // either zone, while holding longitude fixed at Tokyo's, must produce identical pillars —
    // this isolates the timezone/UTC conversion step from the (deliberately
        // longitude-dependent) true-solar-time correction.
    const utcInstant = new Date(Date.UTC(2024, 5, 15, 12, 0));
    const asTokyoLocal = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).format(utcInstant);
    const asLondonLocal = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/London', hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).format(utcInstant);
    expect(asTokyoLocal).toBe('21:00');
    expect(asLondonLocal).toBe('13:00');

    const viaTokyoDescription = internationalBirthToSajuChart({
      year: 2024, month: 6, day: 15, hour: 21, minute: 0, timeZone: 'Asia/Tokyo', longitude: 139.6917,
    });
    const viaLondonDescriptionSameLongitude = internationalBirthToSajuChart({
      year: 2024, month: 6, day: 15, hour: 13, minute: 0, timeZone: 'Europe/London', longitude: 139.6917,
    });
    expect(viaTokyoDescription.pillars).toEqual(viaLondonDescriptionSameLongitude.pillars);
  });
});

describe('internationalBirthToSajuChart — DST gap and ambiguity policy', () => {
  it('spring-forward gap: US 2024-03-10 02:30 does not exist (clocks jump 02:00->03:00) — resolved by shifting forward by the gap', () => {
    const chart = internationalBirthToSajuChart({
      year: 2024, month: 3, day: 10, hour: 2, minute: 30, timeZone: 'America/New_York', longitude: -74.006,
    });
    // Per policy, 02:30 (nonexistent) shifts forward by the 1h gap to 03:30 EDT.
    expectPillarsMatch(chart, oracle(2024, 3, 10, 3, 30, EDT, -74.006));
  });

  it('fall-back ambiguity: US 2024-11-03 01:30 occurs twice (clocks fall back 02:00->01:00) — resolved to the EARLIER (EDT) instant', () => {
    const chart = internationalBirthToSajuChart({
      year: 2024, month: 11, day: 3, hour: 1, minute: 30, timeZone: 'America/New_York', longitude: -74.006,
    });
    // Earlier instant = still-DST (EDT), not the later EST occurrence.
    expectPillarsMatch(chart, oracle(2024, 11, 3, 1, 30, EDT, -74.006));
  });

  it('London BST-start gap: 2024-03-31 01:30 does not exist (clocks jump 01:00->02:00) — shifts forward to 02:30 BST', () => {
    const chart = internationalBirthToSajuChart({
      year: 2024, month: 3, day: 31, hour: 1, minute: 30, timeZone: 'Europe/London', longitude: -0.1276,
    });
    expectPillarsMatch(chart, oracle(2024, 3, 31, 2, 30, BST, -0.1276));
  });

  it('Southern-hemisphere gap: Sydney 2024-10-06 02:30 does not exist (clocks jump 02:00->03:00 for AEDT)', () => {
    const chart = internationalBirthToSajuChart({
      year: 2024, month: 10, day: 6, hour: 2, minute: 30, timeZone: 'Australia/Sydney', longitude: 151.2093,
    });
    expectPillarsMatch(chart, oracle(2024, 10, 6, 3, 30, AEDT, 151.2093));
  });
});

describe('internationalBirthToSajuChart — unknown birth time (local-noon convention)', () => {
  it('hour omitted -> timeUnknown=true, no hour pillar, date resolved via local noon at the birthplace', () => {
    const chart = internationalBirthToSajuChart({
      year: 2024, month: 1, day: 15, timeZone: 'America/New_York', longitude: -74.006,
    });
    expect(chart.timeUnknown).toBe(true);
    expect(chart.pillars.hour).toBeUndefined();
    const o = oracle(2024, 1, 15, 12, 0, EST, -74.006); // noon EST (winter, no DST)
    expect(chart.pillars.year).toMatchObject({ stem: o.yearPillarHanja[0]!, branch: o.yearPillarHanja[1]! });
    expect(chart.pillars.day).toMatchObject({ stem: o.dayPillarHanja[0]!, branch: o.dayPillarHanja[1]! });
  });

  it('unknown time near a date-rolling longitude can shift the resolved calendar day relative to the raw input date', () => {
    // Longitude far enough west that local noon's true-solar-time correction pushes into the
    // previous day relative to the raw (year,month,day) input — confirms the noon convention is
    // actually being applied, not just passing the raw date through untouched.
    const chart = internationalBirthToSajuChart({
      year: 2024, month: 6, day: 15, timeZone: 'America/Los_Angeles', longitude: -118.2437,
    });
    const rawDateOnly = calculateSaju(2024, 6, 15, undefined, undefined, { applyTimeCorrection: false });
    expect(chart.pillars.day).not.toEqual({ stem: rawDateOnly.dayPillarHanja[0], branch: rawDateOnly.dayPillarHanja[1] });
  });
});
