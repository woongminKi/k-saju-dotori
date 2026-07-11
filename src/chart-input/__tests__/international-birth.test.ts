// international-birth — golden tests across timezones, cross-validated against direct
// calculateSaju() calls with hand-derived KST-equivalent values (see file header derivation),
// plus a direct cross-check against the Korea-only manseryeok-adapter path for a historical
// Seoul DST birth (proving the IANA/ICU-based conversion reproduces KOREA_DST_PERIODS exactly).
import { describe, it, expect } from 'vitest';
import { calculateSaju } from '@fullstackfamily/manseryeok';
import { birthToSajuChartInternational } from '../international-birth';
import { birthToSajuChart } from '../manseryeok-adapter';

describe('international-birth: birthToSajuChartInternational', () => {
  // ── New York, winter (EST, UTC-5) ──
  it('New York 2024-01-15 08:00 (EST) → UTC 13:00 → KST-equivalent 22:00 same day', () => {
    const chart = birthToSajuChartInternational({
      year: 2024, month: 1, day: 15, hour: 8, minute: 0,
      timeZone: 'America/New_York', longitude: -74.006,
    });
    const oracle = calculateSaju(2024, 1, 15, 22, 0, { longitude: -74.006, applyTimeCorrection: true });
    expect(chart.timeUnknown).toBe(false);
    expect(chart.pillars.year).toMatchObject({ stem: oracle.yearPillarHanja[0]!, branch: oracle.yearPillarHanja[1]! });
    expect(chart.pillars.month).toMatchObject({ stem: oracle.monthPillarHanja[0]!, branch: oracle.monthPillarHanja[1]! });
    expect(chart.pillars.day).toMatchObject({ stem: oracle.dayPillarHanja[0]!, branch: oracle.dayPillarHanja[1]! });
    expect(chart.pillars.hour).toMatchObject({ stem: oracle.hourPillarHanja![0]!, branch: oracle.hourPillarHanja![1]! });
  });

  // ── London, summer (BST, UTC+1) ──
  it('London 2024-07-15 09:30 (BST) → UTC 08:30 → KST-equivalent 17:30 same day', () => {
    const chart = birthToSajuChartInternational({
      year: 2024, month: 7, day: 15, hour: 9, minute: 30,
      timeZone: 'Europe/London', longitude: -0.1276,
    });
    const oracle = calculateSaju(2024, 7, 15, 17, 30, { longitude: -0.1276, applyTimeCorrection: true });
    expect(chart.pillars.day).toMatchObject({ stem: oracle.dayPillarHanja[0]!, branch: oracle.dayPillarHanja[1]! });
    expect(chart.pillars.hour).toMatchObject({ stem: oracle.hourPillarHanja![0]!, branch: oracle.hourPillarHanja![1]! });
  });

  // ── Berlin, winter (CET, UTC+1) ──
  it('Berlin 2024-03-01 06:00 (CET) → UTC 05:00 → KST-equivalent 14:00 same day', () => {
    const chart = birthToSajuChartInternational({
      year: 2024, month: 3, day: 1, hour: 6, minute: 0,
      timeZone: 'Europe/Berlin', longitude: 13.405,
    });
    const oracle = calculateSaju(2024, 3, 1, 14, 0, { longitude: 13.405, applyTimeCorrection: true });
    expect(chart.pillars.day).toMatchObject({ stem: oracle.dayPillarHanja[0]!, branch: oracle.dayPillarHanja[1]! });
    expect(chart.pillars.hour).toMatchObject({ stem: oracle.hourPillarHanja![0]!, branch: oracle.hourPillarHanja![1]! });
  });

  // ── Los Angeles, standard time (PST, UTC-8) — crosses a calendar day boundary ──
  it('Los Angeles 1999-11-20 23:45 (PST) → UTC 1999-11-21 07:45 → KST-equivalent 16:45 (day rolls over)', () => {
    const chart = birthToSajuChartInternational({
      year: 1999, month: 11, day: 20, hour: 23, minute: 45,
      timeZone: 'America/Los_Angeles', longitude: -118.2437,
    });
    const oracle = calculateSaju(1999, 11, 21, 16, 45, { longitude: -118.2437, applyTimeCorrection: true });
    expect(chart.pillars.day).toMatchObject({ stem: oracle.dayPillarHanja[0]!, branch: oracle.dayPillarHanja[1]! });
    expect(chart.pillars.hour).toMatchObject({ stem: oracle.hourPillarHanja![0]!, branch: oracle.hourPillarHanja![1]! });
    // Sanity: the day pillar must differ from what a naive (no-rollover) reading would give —
    // confirms the day boundary crossing was actually exercised, not accidentally a no-op.
    const naive = calculateSaju(1999, 11, 20, 16, 45, { longitude: -118.2437, applyTimeCorrection: true });
    expect(chart.pillars.day).not.toEqual({ stem: naive.dayPillarHanja[0], branch: naive.dayPillarHanja[1] });
  });

  // ── Seoul 1988, during the historical Korean DST period — cross-validated against the
  //    Korea-only manseryeok-adapter path (KOREA_DST_PERIODS + adjustForDst) to prove the
  //    IANA/ICU-based route reproduces that hand-rolled table exactly, for the exact case it
  //    exists to handle. ──
  it('Seoul 1988-06-15 14:30 (Asia/Seoul, DST in effect) matches the Korea-only adapter path exactly', () => {
    const intl = birthToSajuChartInternational({
      year: 1988, month: 6, day: 15, hour: 14, minute: 30,
      timeZone: 'Asia/Seoul', longitude: 127,
    });
    const domestic = birthToSajuChart({ year: 1988, month: 6, day: 15, hour: 14, minute: 30 });
    expect(intl.pillars).toEqual(domestic.pillars);
    expect(intl.timeUnknown).toBe(domestic.timeUnknown);
  });

  // ── timeUnknown — no timezone math attempted, mirrors manseryeok-adapter's own no-time path ──
  it('hour omitted → timeUnknown=true, no hour pillar, raw calendar date passed through untouched', () => {
    const chart = birthToSajuChartInternational({
      year: 2024, month: 1, day: 15, timeZone: 'America/New_York', longitude: -74.006,
    });
    expect(chart.timeUnknown).toBe(true);
    expect(chart.pillars.hour).toBeUndefined();
    const oracle = calculateSaju(2024, 1, 15, undefined, undefined, { longitude: -74.006, applyTimeCorrection: true });
    expect(chart.pillars.year).toMatchObject({ stem: oracle.yearPillarHanja[0]!, branch: oracle.yearPillarHanja[1]! });
    expect(chart.pillars.day).toMatchObject({ stem: oracle.dayPillarHanja[0]!, branch: oracle.dayPillarHanja[1]! });
  });

  // ── Negative-longitude probes — extreme values near the antimeridian must not throw or
  //    wrap around; the library should still return a well-formed 4-pillar chart. ──
  it.each([-170, -74.006, -0.1276, 13.405, 127, 170])(
    'longitude=%d does not throw and produces a well-formed chart',
    (longitude) => {
      const chart = birthToSajuChartInternational({
        year: 2010, month: 6, day: 10, hour: 12, minute: 0,
        timeZone: 'UTC', longitude,
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
