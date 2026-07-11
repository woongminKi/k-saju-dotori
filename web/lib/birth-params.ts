export type Gender = 'M' | 'F';

export interface BirthFields {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  gender: Gender;
  /** IANA timezone id at the birthplace, e.g. 'America/New_York'. Always resolved via the city picker. */
  timeZone: string;
  /** Birthplace longitude in degrees, east-positive. Always resolved via the city picker. */
  longitude: number;
}

/** Pass a prefix to namespace the keys ('a','b'). Used for couple flows. */
export function encodeBirth(b: BirthFields, prefix = ''): Record<string, string> {
  const p = prefix;
  const out: Record<string, string> = {
    [`${p}y`]: String(b.year),
    [`${p}m`]: String(b.month),
    [`${p}d`]: String(b.day),
    [`${p}g`]: b.gender,
    [`${p}tz`]: b.timeZone,
    [`${p}lon`]: String(b.longitude),
  };
  if (b.hour !== undefined) out[`${p}h`] = String(b.hour);
  if (b.minute !== undefined) out[`${p}mi`] = String(b.minute);
  return out;
}

function num(params: URLSearchParams, key: string): number | undefined {
  const v = params.get(key);
  if (v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

/** Read an optional integer from form input. Empty/null -> undefined -> treated as 'unknown time'. */
export function readOptionalInt(v: FormDataEntryValue | null): number | undefined {
  if (v === null) return undefined;
  const s = String(v).trim();
  if (s === '') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export function decodeBirth(params: URLSearchParams, prefix = ''): BirthFields {
  const p = prefix;
  const year = num(params, `${p}y`);
  const month = num(params, `${p}m`);
  const day = num(params, `${p}d`);
  const gender = params.get(`${p}g`);
  const timeZone = params.get(`${p}tz`);
  const longitude = num(params, `${p}lon`);
  const hour = num(params, `${p}h`);
  const minute = num(params, `${p}mi`);

  if (year === undefined || month === undefined || day === undefined) {
    throw new Error('Birth year, month and day are required.');
  }
  if (!Number.isInteger(year) || year < 1900 || year > 2050) throw new Error('Year must be between 1900 and 2050.');
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error('Month is invalid.');
  if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error('Day is invalid.');
  if (gender !== 'M' && gender !== 'F') throw new Error('Gender is invalid.');
  if (!timeZone) throw new Error('Birthplace timezone is required.');
  if (longitude === undefined || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('Birthplace longitude is invalid.');
  }
  if (hour !== undefined && (!Number.isInteger(hour) || hour < 0 || hour > 23)) throw new Error('Hour is invalid.');
  if (minute !== undefined && (!Number.isInteger(minute) || minute < 0 || minute > 59)) throw new Error('Minute is invalid.');

  const out: BirthFields = { year, month, day, gender, timeZone, longitude };
  if (hour !== undefined) out.hour = hour;
  if (minute !== undefined) out.minute = minute;
  return out;
}

/** FormData -> BirthFields. Parses a form submission in a server action. Empty time = 'unknown time'. */
export function readBirthFromFormData(fd: FormData, prefix = ''): BirthFields {
  const params = new URLSearchParams();
  const short = {
    year: 'y', month: 'm', day: 'd', gender: 'g',
    hour: 'h', minute: 'mi', timeZone: 'tz', longitude: 'lon',
  } as const;
  for (const key of Object.keys(short) as (keyof typeof short)[]) {
    const v = fd.get(`${prefix}${key}`);
    if (v !== null && String(v).trim() !== '') {
      params.set(short[key], String(v));
    }
  }
  return decodeBirth(params);
}

export function decodeCouple(params: URLSearchParams): { person: BirthFields; partner: BirthFields } {
  return { person: decodeBirth(params, 'a'), partner: decodeBirth(params, 'b') };
}

/** Deterministic normalized string for birthHash input + at-rest encryption. Same input -> same string. */
export function normalizeBirthFields(b: BirthFields): string {
  return [b.year, b.month, b.day, b.hour ?? '', b.minute ?? '', b.gender, b.timeZone, b.longitude].join('|');
}
