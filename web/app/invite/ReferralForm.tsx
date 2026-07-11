'use client';
import { useState } from 'react';
import { buttonClass } from '../../components/ui/Button';

export function ReferralForm({ initialCode = '' }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setMsg('');
    setBusy(true);
    try {
      const res = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? 'Couldn’t apply that code.');
        return;
      }
      setOk(true);
      setMsg('Referral applied! You got 100 points.');
    } catch {
      setMsg('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (ok) return <p className="text-sm text-leaf">{msg}</p>;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-bark">Enter a referral code</label>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="DOTORI-XXXX"
          className="flex-1 rounded-lg border border-line bg-card px-3 py-2 uppercase text-bark focus:outline-none focus:ring-2 focus:ring-acorn/40"
        />
        <button
          type="button"
          disabled={busy || !code.trim()}
          onClick={submit}
          className={buttonClass('primary', 'md', 'disabled:opacity-50')}
        >
          Apply
        </button>
      </div>
      {msg && <p className="text-sm text-red-600">{msg}</p>}
    </div>
  );
}
