'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { encodeBirth, readOptionalInt, type BirthFields } from '../lib/birth-params';
import { SingleBirthForm } from './SingleBirthForm';
import { buttonClass } from './ui/Button';

export function BirthForm() {
  const router = useRouter();
  const [error, setError] = useState('');

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const year = Number(data.get('year'));
    const month = Number(data.get('month'));
    const day = Number(data.get('day'));
    const timeZone = String(data.get('timeZone') ?? '');
    const longitude = data.get('longitude');

    if (!year || !month || !day) {
      setError('Please enter your birth date.');
      return;
    }
    if (!timeZone) {
      setError('Please choose your birthplace.');
      return;
    }
    const fields: BirthFields = {
      year,
      month,
      day,
      gender: data.get('gender') === 'M' ? 'M' : 'F',
      timeZone,
      longitude: longitude !== null && longitude !== '' ? Number(longitude) : 0,
    };
    const hour = readOptionalInt(data.get('hour'));
    const minute = readOptionalInt(data.get('minute'));
    if (hour !== undefined) fields.hour = hour;
    if (minute !== undefined) fields.minute = minute;

    const qs = new URLSearchParams(encodeBirth(fields)).toString();
    router.push(`/result?${qs}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <SingleBirthForm />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className={buttonClass('primary', 'md', 'w-full')}>
        Read my fortune
      </button>
    </form>
  );
}
