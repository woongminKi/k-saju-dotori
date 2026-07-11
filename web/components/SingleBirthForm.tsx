'use client';
import { useMemo, useState } from 'react';
import { CITIES, DEFAULT_LONGITUDE, type City } from '../lib/cities-en';

/** Shared tone for birth-input fields. Inputs and selects use the same class. */
export const inputClass =
  'rounded-lg border border-line bg-card px-3 py-2 text-bark focus:outline-none focus:ring-2 focus:ring-acorn/40';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const YEARS = Array.from({ length: 2026 - 1930 + 1 }, (_, i) => 2026 - i);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const HOURS12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

// Human-readable country names for the "Can't find your city?" fallback. Codes come from cities-en.ts.
const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', CA: 'Canada', GB: 'United Kingdom', IE: 'Ireland', AU: 'Australia',
  NZ: 'New Zealand', DE: 'Germany', FR: 'France', ES: 'Spain', IT: 'Italy', PT: 'Portugal',
  NL: 'Netherlands', BE: 'Belgium', LU: 'Luxembourg', CH: 'Switzerland', AT: 'Austria',
  DK: 'Denmark', NO: 'Norway', SE: 'Sweden', FI: 'Finland', IS: 'Iceland', PL: 'Poland',
  CZ: 'Czechia', SK: 'Slovakia', HU: 'Hungary', RO: 'Romania', BG: 'Bulgaria', GR: 'Greece',
  HR: 'Croatia', SI: 'Slovenia', EE: 'Estonia', LV: 'Latvia', LT: 'Lithuania', TR: 'Turkey',
  RU: 'Russia', KR: 'South Korea', JP: 'Japan', CN: 'China', HK: 'Hong Kong', TW: 'Taiwan',
  SG: 'Singapore', IN: 'India', AE: 'United Arab Emirates', MX: 'Mexico', BR: 'Brazil',
  AR: 'Argentina', EG: 'Egypt', ZA: 'South Africa',
};

// Derived from CITIES (single source): country -> its timezones, and a representative longitude per zone.
const COUNTRY_TIMEZONES: Record<string, string[]> = {};
const TZ_LONGITUDE: Record<string, number> = {};
for (const c of CITIES) {
  const zones = (COUNTRY_TIMEZONES[c.country] ??= []);
  if (!zones.includes(c.timeZone)) zones.push(c.timeZone);
  if (TZ_LONGITUDE[c.timeZone] === undefined) TZ_LONGITUDE[c.timeZone] = c.longitude;
}
const COUNTRY_OPTIONS = Object.keys(COUNTRY_TIMEZONES).sort((a, b) =>
  (COUNTRY_NAMES[a] ?? a).localeCompare(COUNTRY_NAMES[b] ?? b),
);

function to24Hour(hour12: number, ampm: 'AM' | 'PM'): number {
  const base = hour12 % 12; // 12 -> 0
  return ampm === 'AM' ? base : base + 12;
}

/** Searchable city combobox + a country/timezone fallback for cities not in the list.
 *  Writes the resolved timeZone + longitude into hidden inputs named `${prefix}tz` / `${prefix}lon`. */
function CityPicker({ prefix }: { prefix: string }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<City | null>(null);
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const [country, setCountry] = useState('');
  const [zone, setZone] = useState('');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as City[];
    return CITIES.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        (COUNTRY_NAMES[c.country] ?? '').toLowerCase().includes(q),
    ).slice(0, 8);
  }, [query]);

  const zonesForCountry = country ? (COUNTRY_TIMEZONES[country] ?? []) : [];
  const manualLon = zone ? (TZ_LONGITUDE[zone] ?? DEFAULT_LONGITUDE) : DEFAULT_LONGITUDE;

  // Effective values submitted with the form.
  const effectiveTimeZone = manual ? zone : selected?.timeZone ?? '';
  const effectiveLongitude = manual ? manualLon : selected?.longitude ?? '';

  return (
    <div className="space-y-2">
      {!manual ? (
        <div className="relative">
          <input
            type="text"
            aria-label="Birthplace"
            placeholder="Search your city of birth"
            value={query}
            autoComplete="off"
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            className={`w-full ${inputClass}`}
          />
          {open && matches.length > 0 && !selected && (
            <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-line bg-card shadow-soft">
              {matches.map((c) => (
                <li key={`${c.label}-${c.timeZone}`}>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-bark transition hover:bg-sand"
                    onClick={() => {
                      setSelected(c);
                      setQuery(c.label);
                      setOpen(false);
                    }}
                  >
                    {c.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selected && (
            <p className="mt-1 text-xs text-bark/60">
              Selected: {selected.label} · {selected.timeZone}
            </p>
          )}
          <button
            type="button"
            onClick={() => setManual(true)}
            className="mt-2 text-sm text-acorn hover:underline"
          >
            Can&apos;t find your city?
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <select
            aria-label="Country"
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setZone('');
            }}
            className={`w-full ${inputClass}`}
          >
            <option value="" disabled>
              Select a country
            </option>
            {COUNTRY_OPTIONS.map((code) => (
              <option key={code} value={code}>
                {COUNTRY_NAMES[code] ?? code}
              </option>
            ))}
          </select>
          {country && (
            <select
              aria-label="Time zone"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className={`w-full ${inputClass}`}
            >
              <option value="" disabled>
                Select a time zone
              </option>
              {zonesForCountry.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => setManual(false)}
            className="text-sm text-acorn hover:underline"
          >
            Back to city search
          </button>
        </div>
      )}
      <input type="hidden" name={`${prefix}timeZone`} value={effectiveTimeZone} />
      <input type="hidden" name={`${prefix}longitude`} value={String(effectiveLongitude)} />
    </div>
  );
}

function RangeSelect({
  name,
  placeholder,
  options,
  labels,
  required,
  className,
}: {
  name: string;
  placeholder: string;
  options: number[];
  labels?: string[];
  required?: boolean;
  className?: string;
}) {
  return (
    <select
      name={name}
      aria-label={placeholder}
      defaultValue=""
      required={required}
      className={`${className ?? ''} ${inputClass}`}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((o, i) => (
        <option key={o} value={o}>
          {labels ? labels[i] : o}
        </option>
      ))}
    </select>
  );
}

/** Single-person birth input. Does NOT render its own <form> — drop it inside the parent form. */
export function SingleBirthForm({ prefix = '', label }: { prefix?: string; label?: string }) {
  const [unknownTime, setUnknownTime] = useState(false);
  const [hour12, setHour12] = useState('');
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');

  const hour24 =
    !unknownTime && hour12 !== '' ? String(to24Hour(Number(hour12), ampm)) : '';

  return (
    <fieldset className="space-y-2 rounded-xl border border-line bg-card p-4 shadow-soft">
      {label && <legend className="px-1 font-bold text-acorn-dark">{label}</legend>}
      <div className="flex gap-2">
        <RangeSelect
          name={`${prefix}month`}
          placeholder="Month"
          options={MONTHS.map((_, i) => i + 1)}
          labels={MONTHS}
          required
          className="w-2/5"
        />
        <RangeSelect name={`${prefix}day`} placeholder="Day" options={DAYS} required className="w-1/4" />
        <RangeSelect name={`${prefix}year`} placeholder="Year" options={YEARS} required className="w-1/3" />
      </div>
      <label className="flex items-center gap-2 text-sm text-bark">
        <input
          type="checkbox"
          checked={unknownTime}
          onChange={(e) => setUnknownTime(e.target.checked)}
        />
        I don&apos;t know my birth time
      </label>
      {!unknownTime && (
        <div className="flex gap-2">
          <select
            aria-label="Hour"
            value={hour12}
            onChange={(e) => setHour12(e.target.value)}
            className={`w-1/3 ${inputClass}`}
          >
            <option value="" disabled>
              Hour
            </option>
            {HOURS12.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          <select
            name={`${prefix}minute`}
            aria-label="Minute"
            defaultValue=""
            className={`w-1/3 ${inputClass}`}
          >
            <option value="" disabled>
              Minute
            </option>
            {MINUTES.map((m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, '0')}
              </option>
            ))}
          </select>
          <select
            aria-label="AM/PM"
            value={ampm}
            onChange={(e) => setAmpm(e.target.value === 'PM' ? 'PM' : 'AM')}
            className={`w-1/3 ${inputClass}`}
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
      )}
      <input type="hidden" name={`${prefix}hour`} value={hour24} />
      <select
        name={`${prefix}gender`}
        aria-label="Gender"
        className={`w-full ${inputClass}`}
        defaultValue="F"
      >
        <option value="F">Woman</option>
        <option value="M">Man</option>
      </select>
      <CityPicker prefix={prefix} />
    </fieldset>
  );
}
