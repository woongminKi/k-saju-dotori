// international-birth — converts a birth given in *any* IANA timezone into a SajuChart, without
// going through manseryeok-adapter.ts's KOREA_DST_PERIODS/adjustForDst path (that table only
// corrects Korea's own historical 1948-88 daylight-saving decrees and must never be applied a
// second time to a birth already resolved through its own IANA zone's offset).
//
// manseryeok-adapter.ts is copied byte-identical from the Korean engine and is never edited
// (see ENGINE_SYNC.md) — including its private pillarFromHanja() helper, which is not exported.
// This module duplicates that small, generic (non-Korea-specific) hanja-pair parser rather than
// touching the frozen file.
//
// --- RISK PROBE FINDING: calculateSaju's own longitude correction is unsafe outside Korea ---
// Reading the library's source (@fullstackfamily/manseryeok dist/index.mjs, calculateSaju): when
// applyTimeCorrection is on, it computes `longitudeCorrection = round((135 - longitude) * 4)`
// minutes and applies it to the given minute/hour with only a SINGLE ±1-hour borrow and a single
// ±24-hour wrap — it never rolls the calendar date, and the single borrow only works when the
// correction is under ~60 minutes (i.e. a longitude within roughly Korea's own span, ±15° of
// 135°E — this is a "which Korean city" fine-tuning knob, not a "which country on Earth" one).
// For a longitude like New York's (-74.006), the true correction is ~14 hours; the library's
// single-borrow logic silently produces a nonsensical result (verified: it returns the *same*
// hour pillar for longitude 127 all the way through -170, because the one-time hour decrement
// isn't enough to even cross an hour-branch boundary — this is a silent bug, not a clamp/throw).
//
// FIX (this module never calls calculateSaju with applyTimeCorrection: true): we replicate the
// library's own formula — correctionMinutes = (longitude - 135) * 4 — ourselves via `Date` UTC
// arithmetic (which correctly rolls minute→hour→day→month→year), apply it to the KST-equivalent
// reading, then call calculateSaju with applyTimeCorrection: false so it does not also (incorrectly)
// apply its own single-borrow version on top. Verified byte-for-byte identical to the library's
// own corrected output for both worked README examples (Seoul 127° 14:30→13:58, Busan 129°
// 14:00→13:36), and verified to produce a genuinely different (and date-rolled) hour/day pillar
// for New York's longitude, where the library's own path is a silent no-op.
//
// --- Why "KST-equivalent + longitude-shifted" is correct for any birthplace ---
// True solar time at a birthplace is, by definition, `UTC_instant + longitude/15` hours. Converting
// local wall-clock time to UTC via the birthplace's own (DST-aware) IANA zone, adding a fixed 9h to
// get a KST-equivalent civil reading, and then shifting that reading by (longitude-135)*4 minutes
// (our own correctly-carried version of the library's formula) reproduces exactly that — for any
// longitude, not just Korea's.
import { calculateSaju } from '@fullstackfamily/manseryeok';
import { HIDDEN_STEMS } from './_element-tables';
import type { Pillar, SajuChart } from './types';

export interface InternationalBirthInput {
  /** Local (wall-clock) calendar year at the birthplace. */
  year: number;
  /** Local month, 1-12. */
  month: number;
  /** Local day, 1-31. */
  day: number;
  /** Local hour, 0-23. Omit for an unknown birth time (no hour pillar; timeUnknown=true). */
  hour?: number;
  /** Local minute, 0-59. Default 0. */
  minute?: number;
  /** IANA timezone name at the birthplace, e.g. 'America/New_York'. */
  timeZone: string;
  /** Birthplace longitude in degrees, east-positive (negative = West; e.g. -74.006 for NYC). */
  longitude: number;
}

interface WallClock {
  year: number; month: number; day: number; hour: number; minute: number; second: number;
}

/** Reads `timeZone`'s wall-clock reading at a UTC instant. */
function wallClockParts(timeZone: string, utcInstant: Date): WallClock {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
    .formatToParts(utcInstant)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== 'literal') acc[p.type] = p.value;
      return acc;
    }, {});
  return {
    year: Number(parts['year']),
    month: Number(parts['month']),
    day: Number(parts['day']),
    hour: Number(parts['hour']) % 24, // hourCycle 'h23' can still surface '24' at midnight
    minute: Number(parts['minute']),
    second: Number(parts['second']),
  };
}

/** UTC offset (minutes, east-positive) of `timeZone` at the given UTC instant. */
function utcOffsetMinutes(timeZone: string, utcInstant: Date): number {
  const p = wallClockParts(timeZone, utcInstant);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - utcInstant.getTime()) / 60000);
}

function reproducesWallClock(
  timeZone: string, candidateMs: number,
  year: number, month: number, day: number, hour: number, minute: number,
): boolean {
  const p = wallClockParts(timeZone, new Date(candidateMs));
  return p.year === year && p.month === month && p.day === day && p.hour === hour && p.minute === minute;
}

/**
 * A timezone has at most two distinct standing UTC offsets across a year: a "standard" one and,
 * if it observes DST, a shifted one. Probing noon on January 1st and noon on July 1st reliably
 * samples both (real-world transitions never land within months of either date, regardless of
 * hemisphere), without depending on which direction an iterative guess happens to converge —
 * that iterative approach was tried first and found to miss genuine fall-back ambiguity (both
 * probes can land on the same side of the transition and never surface the other valid reading).
 */
function candidateOffsets(year: number, timeZone: string): number[] {
  const jan = utcOffsetMinutes(timeZone, new Date(Date.UTC(year, 0, 1, 12, 0)));
  const jul = utcOffsetMinutes(timeZone, new Date(Date.UTC(year, 6, 1, 12, 0)));
  return jan === jul ? [jan] : [jan, jul];
}

/**
 * Local wall-clock reading at `timeZone` → the actual UTC instant.
 *
 * DST edge-case policy (both documented and covered by dedicated tests in
 * international-birth.test.ts):
 * - Spring-forward gap (the wall-clock reading doesn't exist, e.g. 2:30 AM on a "spring forward
 *   1→3 AM" day): shift the wall-clock reading forward by the size of the gap and resolve using
 *   the post-transition offset — i.e. 2:30 AM effectively becomes 3:30 AM in the new offset.
 * - Fall-back ambiguity (the wall-clock reading occurs twice, e.g. 1:30 AM on a "fall back 2→1
 *   AM" day): choose the EARLIER of the two real instants (the pre-transition/DST offset).
 */
function localToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const offsets = candidateOffsets(year, timeZone);
  const candidates = offsets.map((o) => guess - o * 60000);
  const valid = candidates.filter((c) => reproducesWallClock(timeZone, c, year, month, day, hour, minute));

  if (valid.length >= 2) {
    return new Date(Math.min(...valid)); // ambiguous — earlier instant per policy
  }
  if (valid.length === 1) {
    return new Date(valid[0]!); // unambiguous
  }

  // Gap — neither standing offset reproduces the input wall-clock reading. Shift the wall-clock
  // forward by the gap size (the absolute difference between the two standing offsets) and
  // resolve using whichever offset reproduces the SHIFTED reading (the post-transition offset).
  const gapMinutes = Math.abs(offsets[0]! - (offsets[1] ?? offsets[0])!);
  const shiftedGuess = guess + gapMinutes * 60000;
  const shiftedTarget = new Date(shiftedGuess); // epoch used purely as a UTC-field calendar calculator
  const ty = shiftedTarget.getUTCFullYear();
  const tm = shiftedTarget.getUTCMonth() + 1;
  const td = shiftedTarget.getUTCDate();
  const th = shiftedTarget.getUTCHours();
  const tmin = shiftedTarget.getUTCMinutes();
  for (const o of offsets) {
    const c = shiftedGuess - o * 60000;
    if (reproducesWallClock(timeZone, c, ty, tm, td, th, tmin)) return new Date(c);
  }
  throw new Error(`international-birth: could not resolve DST gap for ${year}-${month}-${day} ${hour}:${minute} in ${timeZone}`);
}

/**
 * Our own carried version of calculateSaju's true-solar-time formula (see file header) — shifts
 * a UTC-field-bearing Date by (longitude - 135) * 4 minutes, correctly rolling hour/day/month/year
 * via Date arithmetic (unlike the library's own single-borrow version).
 */
function applyLongitudeCorrection(civilReading: Date, longitude: number): Date {
  const correctionMinutes = (longitude - 135) * 4;
  return new Date(civilReading.getTime() + correctionMinutes * 60000);
}

/** Duplicated from manseryeok-adapter.ts (frozen, not exported there) — see file header. */
function pillarFromHanja(p: string): Pillar {
  const stem = p[0]!;
  const branch = p[1]!;
  const hs = HIDDEN_STEMS[branch];
  if (!hs) throw new Error(`international-birth: unknown branch '${branch}' — missing from HIDDEN_STEMS`);
  return { stem, branch, hiddenStems: hs };
}

/**
 * Converts an international birth (local time + IANA timezone + real longitude) into a
 * SajuChart, bypassing manseryeok-adapter.ts's Korea-only DST table AND calculateSaju's own
 * (Korea-scale-only) longitude correction entirely.
 *
 * - hour omitted → the day pillar is resolved using LOCAL NOON at the birthplace as a
 *   representative instant (converted through the same timezone + longitude pipeline as a known
 *   time would be) to determine which KST-equivalent calendar date applies — noon minimizes the
 *   chance of an incorrect date-boundary read relative to assuming either midnight or a zero
 *   offset. The hour pillar itself remains absent (timeUnknown=true); calculateSaju is called
 *   without an hour so no hour pillar is computed.
 * - hour given → local time is resolved to UTC via `timeZone`'s own (DST-aware) rules, converted
 *   to the KST-equivalent civil reading (+9h fixed — NOT via Intl/Asia-Seoul, which would
 *   re-apply Korea's own historical DST), then longitude-corrected via our own carried formula.
 */
export function internationalBirthToSajuChart(input: InternationalBirthInput): SajuChart {
  const timeUnknown = input.hour === undefined;
  const hour = timeUnknown ? 12 : input.hour!; // local noon proxy when time is unknown
  const minute = timeUnknown ? 0 : (input.minute ?? 0);

  const utc = localToUtc(input.year, input.month, input.day, hour, minute, input.timeZone);
  const kst = new Date(utc.getTime() + 9 * 3600 * 1000);
  const corrected = applyLongitudeCorrection(kst, input.longitude);

  if (timeUnknown) {
    const r = calculateSaju(
      corrected.getUTCFullYear(), corrected.getUTCMonth() + 1, corrected.getUTCDate(),
      undefined, undefined,
      { applyTimeCorrection: false },
    );
    return {
      pillars: {
        year: pillarFromHanja(r.yearPillarHanja),
        month: pillarFromHanja(r.monthPillarHanja),
        day: pillarFromHanja(r.dayPillarHanja),
      },
      timeUnknown: true,
    };
  }

  const r = calculateSaju(
    corrected.getUTCFullYear(), corrected.getUTCMonth() + 1, corrected.getUTCDate(),
    corrected.getUTCHours(), corrected.getUTCMinutes(),
    { applyTimeCorrection: false },
  );
  if (!r.hourPillarHanja) {
    throw new Error('international-birth: hour was given but hourPillar was null — unexpected library response');
  }
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
