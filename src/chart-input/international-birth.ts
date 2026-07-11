// international-birth — converts a birth given in *any* IANA timezone into the KST-equivalent
// input that manseryeok's calculateSaju() expects, without going through manseryeok-adapter.ts's
// KOREA_DST_PERIODS/adjustForDst path (that table only corrects Korea's own historical 1948-88
// daylight-saving decrees and must never be applied a second time to a birth that has already
// been resolved through its own IANA zone's — possibly DST-aware — offset).
//
// manseryeok-adapter.ts is copied byte-identical from the Korean engine and is never edited
// (see ENGINE_SYNC.md) — including its private pillarFromHanja() helper, which is not exported.
// This module duplicates that small, generic (non-Korea-specific) hanja-pair parser rather than
// touching the frozen file.
//
// --- Why "KST-equivalent + real longitude" is correct for any birthplace ---
// calculateSaju(year, month, day, hour, minute, { longitude, applyTimeCorrection }) treats its
// (year..minute) as a UTC+9 civil-clock reading and — when applyTimeCorrection is on — applies a
// linear "true solar time" correction of (longitude - 135)/15 hours against it (135°E is the
// meridian that UTC+9 legally represents; this is why even Korean birth charts pass longitude=127
// for Seoul instead of using UTC+9 as-is). Composing the two steps:
//   true_solar_time = (UTC_instant + 9h) + (longitude - 135)/15h = UTC_instant + longitude/15h
// which is exactly the timezone-agnostic definition of true solar time at `longitude`, for ANY
// birthplace on Earth — not just Korea. So the only two things this module needs to get right
// are: (1) the correct UTC instant of birth (via the birthplace's actual IANA zone, DST included)
// and (2) the birthplace's actual longitude (not Korea's).
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
  /** Birthplace longitude in degrees, east-positive (e.g. -74.006 for New York City). */
  longitude: number;
}

/** UTC offset (minutes, east-positive) of `timeZone` at the given UTC instant — DST-aware. */
function utcOffsetMinutes(timeZone: string, utcInstant: Date): number {
  // Format the UTC instant as wall-clock time in `timeZone`, then diff against the instant
  // itself. Because this is evaluated *at* the instant (not via a fixed rule), it automatically
  // resolves historical DST correctly — including Korea's own 1948-88 rules, which Node's bundled
  // ICU/tzdata already encodes for Asia/Seoul (verified against KOREA_DST_PERIODS by hand).
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
  const hour = Number(parts['hour']) % 24; // hourCycle 'h23' can still surface '24' at midnight
  const asUtc = Date.UTC(
    Number(parts['year']), Number(parts['month']) - 1, Number(parts['day']),
    hour, Number(parts['minute']), Number(parts['second']),
  );
  return Math.round((asUtc - utcInstant.getTime()) / 60000);
}

/**
 * Local wall-clock reading at `timeZone` → the actual UTC instant, resolving DST via the zone's
 * own rules (not a fixed offset). Two passes: the first guesses the offset from a naive
 * UTC-as-if-local reading; the second re-evaluates the offset at the corrected instant, which
 * stabilizes the result across a DST transition boundary.
 */
function localToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const offset1 = utcOffsetMinutes(timeZone, new Date(guess));
  const corrected = guess - offset1 * 60000;
  const offset2 = utcOffsetMinutes(timeZone, new Date(corrected));
  return new Date(guess - offset2 * 60000);
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
 * SajuChart, bypassing manseryeok-adapter.ts's Korea-only DST table entirely.
 *
 * - hour omitted → no timezone math is attempted (mirrors manseryeok-adapter's own no-time path,
 *   which likewise skips DST/solar-time correction and passes the given calendar date through
 *   as-is) — there is no well-defined UTC instant without a time of day.
 * - hour given → local time is resolved to UTC via `timeZone`'s own (DST-aware) rules, converted
 *   to the KST-equivalent civil reading, and passed to calculateSaju together with the real
 *   birthplace longitude for true-solar-time correction.
 */
export function birthToSajuChartInternational(input: InternationalBirthInput): SajuChart {
  const timeUnknown = input.hour === undefined;

  if (timeUnknown) {
    const r = calculateSaju(input.year, input.month, input.day, undefined, undefined, {
      longitude: input.longitude,
      applyTimeCorrection: true,
    });
    return {
      pillars: {
        year: pillarFromHanja(r.yearPillarHanja),
        month: pillarFromHanja(r.monthPillarHanja),
        day: pillarFromHanja(r.dayPillarHanja),
      },
      timeUnknown: true,
    };
  }

  const utc = localToUtc(input.year, input.month, input.day, input.hour!, input.minute ?? 0, input.timeZone);
  const kst = new Date(utc.getTime() + 9 * 3600 * 1000);
  const r = calculateSaju(
    kst.getUTCFullYear(),
    kst.getUTCMonth() + 1,
    kst.getUTCDate(),
    kst.getUTCHours(),
    kst.getUTCMinutes(),
    { longitude: input.longitude, applyTimeCorrection: true },
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
