'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ORACLE_CATEGORIES } from '@engine/oracle';
import { readBirthFromFormData, type BirthFields } from '../lib/birth-params';
import { SingleBirthForm } from './SingleBirthForm';
import { buttonClass } from './ui/Button';
import { drawOracleAction } from '../app/menu/oracle/actions';

type Step = 'birth' | 'pick' | 'result' | 'needCredit';
interface DrawResult {
  answer: string;
  reason: string;
  question: string;
  freeLeft: number | null;
}

export function OracleExperience() {
  const [step, setStep] = useState<Step>('birth');
  const [birth, setBirth] = useState<BirthFields | null>(null);
  const [cat, setCat] = useState(0);
  const [result, setResult] = useState<DrawResult | null>(null);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function submitBirth(fd: FormData) {
    setError('');
    try {
      setBirth(readBirthFromFormData(fd));
      setStep('pick');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please check your birth details.');
    }
  }

  function pick(questionId: string) {
    if (!birth || pending) return;
    setError('');
    startTransition(async () => {
      const res = await drawOracleAction({ birth, questionId });
      if (res.kind === 'ok') {
        setResult({ answer: res.answer, reason: res.reason, question: res.question, freeLeft: res.freeLeft });
        setStep('result');
      } else if (res.kind === 'needCredit') {
        setStep('needCredit');
      } else if (res.kind === 'error') {
        setError(res.message);
      } else {
        setError('Dotori couldn’t pull an acorn. Try again in a moment.');
      }
    });
  }

  // Jar-shaking overlay
  if (pending) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="relative flex h-48 w-48 items-center justify-center rounded-full bg-sand">
          <span aria-hidden="true" className="animate-dotori-shake text-7xl">🫙</span>
        </div>
        <p className="text-bark/70">Dotori is shaking the jar...</p>
      </div>
    );
  }

  if (step === 'birth') {
    return (
      <form action={submitBirth} className="space-y-4">
        <p className="text-sm text-bark/70">First, tell me your birthday. I&apos;ll read your saju to carve an answer into the acorn.</p>
        <SingleBirthForm />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className={buttonClass('primary', 'md', 'w-full')}>
          Go to the acorn jar
        </button>
      </form>
    );
  }

  if (step === 'needCredit') {
    return (
      <div className="space-y-4 text-center">
        <div className="text-5xl">🐿️</div>
        <h2 className="text-xl font-extrabold text-acorn-dark">You&apos;ve used your free draws!</h2>
        <p className="text-sm text-bark/70">
          Top up acorn credits to keep drawing. Want to hear the next acorn&apos;s answer?
        </p>
        <div className="flex flex-col items-center gap-2">
          <Link href="/checkout?product=oracle" className={buttonClass('primary')}>Get acorn credits</Link>
          <button type="button" onClick={() => setStep('pick')} className={buttonClass('ghost', 'sm')}>
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (step === 'result' && result) {
    return (
      <div className="flex flex-col items-center gap-5 py-4 text-center">
        <p className="text-sm text-bark/60">{result.question}</p>
        <div className="animate-dotori-pop flex flex-col items-center">
          <div className="h-2.5 w-1.5 rounded-full bg-acorn-dark" />
          <div className="-mb-1.5 h-5 w-40 rounded-[50%] bg-acorn-dark" />
          <div
            className="flex min-h-[7.5rem] w-44 items-center justify-center bg-gradient-to-b from-caramel to-acorn px-5 py-6 shadow-soft"
            style={{ borderRadius: '46% 46% 44% 44% / 38% 38% 62% 62%' }}
          >
            <span className="text-2xl font-extrabold leading-snug text-cream">{result.answer}</span>
          </div>
        </div>
        <p className="animate-dotori-fade-up max-w-md text-bark/80 leading-relaxed">{result.reason}</p>
        {result.freeLeft !== null && (
          <p className="text-xs text-bark/50">{result.freeLeft} free draws left</p>
        )}
        <button type="button" onClick={() => { setResult(null); setStep('pick'); }} className={buttonClass('ghost', 'sm')}>
          Draw another question
        </button>
      </div>
    );
  }

  // step === 'pick'
  const category = ORACLE_CATEGORIES[cat]!;
  return (
    <div className="space-y-4">
      <p className="text-sm text-bark/70">Pick a question. Dotori will shake the jar and pull an acorn for you.</p>
      <div className="flex flex-wrap gap-2">
        {ORACLE_CATEGORIES.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(i)}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              i === cat ? 'bg-acorn text-cream' : 'bg-sand text-bark/70 hover:bg-line'
            }`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>
      <div className="grid gap-2">
        {category.questions.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => pick(q.id)}
            className="rounded-xl border border-line bg-card px-4 py-3 text-left text-sm text-bark shadow-soft transition hover:border-acorn hover:bg-sand"
          >
            {q.text}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
