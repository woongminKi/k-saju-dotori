'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { encodeBirth, readOptionalInt, type BirthFields } from '../lib/birth-params';
import { SingleBirthForm } from './SingleBirthForm';
import { buttonClass } from './ui/Button';

function readPerson(data: FormData, prefix: string): BirthFields {
  const lon = data.get(`${prefix}longitude`);
  const f: BirthFields = {
    year: Number(data.get(`${prefix}year`)),
    month: Number(data.get(`${prefix}month`)),
    day: Number(data.get(`${prefix}day`)),
    gender: data.get(`${prefix}gender`) === 'M' ? 'M' : 'F',
    timeZone: String(data.get(`${prefix}timeZone`) ?? ''),
    longitude: lon !== null && lon !== '' ? Number(lon) : 0,
  };
  const hour = readOptionalInt(data.get(`${prefix}hour`));
  const minute = readOptionalInt(data.get(`${prefix}minute`));
  if (hour !== undefined) f.hour = hour;
  if (minute !== undefined) f.minute = minute;
  return f;
}

export function CouplePairForm({ resultPath, submitLabel }: { resultPath: string; submitLabel: string }) {
  const router = useRouter();
  const [error, setError] = useState('');

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const a = readPerson(data, 'a_');
    const b = readPerson(data, 'b_');
    if (!a.year || !b.year) {
      setError('Please enter both birth dates.');
      return;
    }
    if (!a.timeZone || !b.timeZone) {
      setError('Please choose both birthplaces.');
      return;
    }
    const qs = new URLSearchParams({ ...encodeBirth(a, 'a'), ...encodeBirth(b, 'b') }).toString();
    router.push(`${resultPath}?${qs}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <SingleBirthForm prefix="a_" label="You" />
      <SingleBirthForm prefix="b_" label="Your partner" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className={buttonClass('primary', 'md', 'w-full')}>{submitLabel}</button>
    </form>
  );
}
