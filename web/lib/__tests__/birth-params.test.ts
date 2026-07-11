import { describe, it, expect } from 'vitest';
import {
  encodeBirth, decodeBirth, decodeCouple, readOptionalInt, normalizeBirthFields,
  readBirthFromFormData, type BirthFields,
} from '../birth-params';

const sample: BirthFields = {
  year: 1990, month: 5, day: 15, hour: 14, minute: 30,
  gender: 'M', timeZone: 'America/New_York', longitude: -74.006,
};

describe('birth-params', () => {
  it('encode -> decode round-trip', () => {
    const params = new URLSearchParams(encodeBirth(sample));
    expect(decodeBirth(params)).toEqual(sample);
  });

  it('unknown time omits hour/minute', () => {
    const noTime: BirthFields = { year: 2000, month: 1, day: 1, gender: 'F', timeZone: 'Europe/London', longitude: -0.1276 };
    const params = new URLSearchParams(encodeBirth(noTime));
    const out = decodeBirth(params);
    expect(out.hour).toBeUndefined();
    expect(out.minute).toBeUndefined();
    expect(out).toEqual(noTime);
  });

  it('range violations throw', () => {
    expect(() => decodeBirth(new URLSearchParams('y=1800&m=1&d=1&g=M&tz=UTC&lon=0'))).toThrow();
    expect(() => decodeBirth(new URLSearchParams('y=1990&m=13&d=1&g=M&tz=UTC&lon=0'))).toThrow();
    expect(() => decodeBirth(new URLSearchParams('y=1990&m=5&d=15&g=X&tz=UTC&lon=0'))).toThrow();
  });

  it('missing timezone throws', () => {
    expect(() => decodeBirth(new URLSearchParams('y=1990&m=5&d=15&g=M&lon=0'))).toThrow();
  });

  it('invalid or out-of-range longitude throws', () => {
    expect(() => decodeBirth(new URLSearchParams('y=1990&m=5&d=15&g=M&tz=UTC&lon=abc'))).toThrow();
    expect(() => decodeBirth(new URLSearchParams('y=1990&m=5&d=15&g=M&tz=UTC&lon=999'))).toThrow();
  });

  it('couple decodes an a/b pair', () => {
    const a: BirthFields = { year: 1990, month: 5, day: 15, gender: 'M', timeZone: 'America/New_York', longitude: -74 };
    const b: BirthFields = { year: 1992, month: 7, day: 20, gender: 'F', timeZone: 'Europe/Paris', longitude: 2.35 };
    const qs = new URLSearchParams({ ...encodeBirth(a, 'a'), ...encodeBirth(b, 'b') });
    const { person, partner } = decodeCouple(qs);
    expect(person.year).toBe(1990);
    expect(partner.year).toBe(1992);
    expect(person.timeZone).toBe('America/New_York');
    expect(partner.timeZone).toBe('Europe/Paris');
  });

  it('readOptionalInt: empty/whitespace/null -> undefined, digits convert', () => {
    expect(readOptionalInt(null)).toBeUndefined();
    expect(readOptionalInt('')).toBeUndefined();
    expect(readOptionalInt('  ')).toBeUndefined();
    expect(readOptionalInt('abc')).toBeUndefined();
    expect(readOptionalInt('0')).toBe(0);
    expect(readOptionalInt('14')).toBe(14);
  });

  it('normalizeBirthFields is deterministic and distinguishes inputs', () => {
    const a: BirthFields = { year: 1990, month: 5, day: 3, gender: 'M', timeZone: 'UTC', longitude: 0 };
    const b: BirthFields = { year: 1990, month: 5, day: 3, gender: 'M', timeZone: 'UTC', longitude: 0 };
    const c: BirthFields = { year: 1990, month: 5, day: 3, gender: 'F', timeZone: 'UTC', longitude: 0 };
    const d: BirthFields = { year: 1990, month: 5, day: 3, hour: 14, gender: 'M', timeZone: 'UTC', longitude: 0 };
    const e: BirthFields = { year: 1990, month: 5, day: 3, gender: 'M', timeZone: 'Asia/Seoul', longitude: 0 };
    expect(normalizeBirthFields(a)).toBe(normalizeBirthFields(b));
    expect(normalizeBirthFields(a)).not.toBe(normalizeBirthFields(c));
    expect(normalizeBirthFields(a)).not.toBe(normalizeBirthFields(d));
    expect(normalizeBirthFields(a)).not.toBe(normalizeBirthFields(e));
  });
});

describe('readBirthFromFormData', () => {
  it('parses required fields with a known time', () => {
    const fd = new FormData();
    fd.set('year', '1990'); fd.set('month', '5'); fd.set('day', '13');
    fd.set('hour', '9'); fd.set('minute', '30'); fd.set('gender', 'F');
    fd.set('timeZone', 'America/Los_Angeles'); fd.set('longitude', '-118.24');
    const b = readBirthFromFormData(fd);
    expect(b).toEqual({
      year: 1990, month: 5, day: 13, hour: 9, minute: 30,
      gender: 'F', timeZone: 'America/Los_Angeles', longitude: -118.24,
    });
  });

  it('empty time -> no hour/minute (unknown time)', () => {
    const fd = new FormData();
    fd.set('year', '2000'); fd.set('month', '1'); fd.set('day', '1');
    fd.set('gender', 'M'); fd.set('timeZone', 'UTC'); fd.set('longitude', '0');
    const b = readBirthFromFormData(fd);
    expect(b.hour).toBeUndefined();
    expect(b.minute).toBeUndefined();
    expect(b.gender).toBe('M');
  });

  it('supports a prefix', () => {
    const fd = new FormData();
    fd.set('g_year', '1988'); fd.set('g_month', '12'); fd.set('g_day', '3');
    fd.set('g_gender', 'M'); fd.set('g_timeZone', 'Europe/Berlin'); fd.set('g_longitude', '13.4');
    const b = readBirthFromFormData(fd, 'g_');
    expect(b.year).toBe(1988);
    expect(b.month).toBe(12);
    expect(b.timeZone).toBe('Europe/Berlin');
  });

  it('missing year/month/day -> throw', () => {
    const fd = new FormData();
    fd.set('gender', 'M'); fd.set('timeZone', 'UTC'); fd.set('longitude', '0');
    expect(() => readBirthFromFormData(fd)).toThrow();
  });
});
