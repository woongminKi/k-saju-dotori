import { describe, it, expect } from 'vitest';
import { CITIES } from '../cities-en';

// Prefer the runtime's canonical zone list where available; otherwise fall back to asking the
// Intl engine to build a formatter for the zone (throws RangeError for an invalid zone id).
const supported: Set<string> | undefined = (() => {
  const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
  return typeof fn === 'function' ? new Set(fn('timeZone')) : undefined;
})();

function isValidZone(tz: string): boolean {
  // supportedValuesOf() only lists one canonical spelling per tzdata Link-alias group (e.g. it
  // omits 'Asia/Kolkata' in favor of 'Asia/Calcutta', and 'America/Indiana/Indianapolis' in favor
  // of 'America/Indianapolis') even though the omitted spelling is an equally valid, commonly-used
  // IANA zone id that resolves identically at runtime. So a zone not in that list is only actually
  // invalid if the Intl engine also refuses to construct a formatter for it.
  if (supported?.has(tz)) return true;
  try {
    // eslint-disable-next-line no-new
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

describe('cities-en dataset', () => {
  it('has a substantial number of cities', () => {
    expect(CITIES.length).toBeGreaterThanOrEqual(150);
  });

  it('every timeZone is a valid IANA zone id', () => {
    const invalid = CITIES.filter((c) => !isValidZone(c.timeZone)).map((c) => `${c.label} (${c.timeZone})`);
    expect(invalid).toEqual([]);
  });

  it('every longitude is east-positive within [-180, 180]', () => {
    for (const c of CITIES) {
      expect(Number.isFinite(c.longitude)).toBe(true);
      expect(c.longitude).toBeGreaterThanOrEqual(-180);
      expect(c.longitude).toBeLessThanOrEqual(180);
    }
  });

  it('every entry has a non-empty label and country', () => {
    for (const c of CITIES) {
      expect(c.label.trim().length).toBeGreaterThan(0);
      expect(c.country.trim().length).toBeGreaterThan(0);
    }
  });

  it('labels are unique', () => {
    const labels = CITIES.map((c) => c.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('is weighted toward the US', () => {
    const us = CITIES.filter((c) => c.country === 'US').length;
    expect(us).toBeGreaterThanOrEqual(50);
  });
});
