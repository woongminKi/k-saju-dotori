'use client';
import { useState } from 'react';
import Link from 'next/link';
import { CREDIT_PACKAGES, ORACLE_PACKAGES, type ProductKind } from '../../lib/pricing';
import { buttonClass } from '../../components/ui/Button';
import { track } from '@vercel/analytics';

/** Format USD cents as e.g. "$4.99". */
function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function CheckoutForm({
  pointsBalance,
  defaultProduct = 'reading',
}: {
  pointsBalance: number;
  defaultProduct?: ProductKind;
}) {
  const [product, setProduct] = useState<ProductKind>(defaultProduct);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [points, setPoints] = useState(0);

  const packages = product === 'oracle' ? ORACLE_PACKAGES : CREDIT_PACKAGES;
  const pkg = packages.find((p) => p.units === selected);
  // Points act as cents off the total.
  const maxPoints = pkg ? Math.min(pointsBalance, pkg.amountCents) : 0;
  const finalAmount = pkg ? Math.max(0, pkg.amountCents - points) : 0;
  const unitLabel = product === 'oracle' ? 'draws' : 'credits';

  function switchProduct(next: ProductKind) {
    setProduct(next);
    setSelected(null);
    setPoints(0);
    setError('');
  }

  async function buy() {
    if (!pkg) return;
    track('checkout_start', { product, units: pkg.units });
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ units: pkg.units, pointsApplied: points, product }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Payment failed.');
        return;
      }
      window.location.href = data.redirectUrl;
    } catch {
      setError('Something went wrong starting your payment.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['reading', 'oracle'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => switchProduct(p)}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              product === p ? 'bg-acorn text-cream' : 'bg-sand text-bark/70 hover:bg-line'
            }`}
          >
            {p === 'reading' ? 'Reading credits' : '🐿️ Acorn oracle'}
          </button>
        ))}
      </div>
      <div className="text-sm text-bark/70">Points: {pointsBalance.toLocaleString()} (each point = 1¢ off)</div>
      <div className="grid grid-cols-2 gap-3">
        {packages.map((p) => (
          <button
            key={p.units}
            type="button"
            onClick={() => { setSelected(p.units); setPoints(0); }}
            className={`rounded-xl border p-4 text-left shadow-soft transition ${
              selected === p.units ? 'border-acorn bg-sand' : 'border-line bg-card hover:bg-sand'
            }`}
          >
            <div className="text-lg font-semibold text-bark">{p.units} {unitLabel}</div>
            <div className="text-sm text-bark/70">{usd(p.amountCents)}</div>
          </button>
        ))}
      </div>

      {pkg && (
        <div className="space-y-2 rounded-xl border border-line bg-card p-4 shadow-soft">
          <label className="block text-sm font-medium text-bark">Points to use (max {maxPoints.toLocaleString()})</label>
          <input
            type="number"
            min={0}
            max={maxPoints}
            value={points}
            onChange={(e) => setPoints(Math.max(0, Math.min(maxPoints, Number(e.target.value) || 0)))}
            className="w-full rounded-lg border border-line bg-card px-3 py-2 text-bark focus:outline-none focus:ring-2 focus:ring-acorn/40"
          />
          <div className="text-sm text-bark/70">
            Total: <b className="text-acorn-dark">{usd(finalAmount)}</b>
            {finalAmount === 0 && ' (fully covered by points)'}
          </div>
          <p className="text-[13px] text-bark/60">
            This is digital content, delivered instantly on payment. Refunds follow our{' '}
            <Link href="/refund" className="underline">Refund Policy</Link>.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={buy}
            className={buttonClass('primary', 'md', 'w-full disabled:opacity-50')}
          >
            {finalAmount === 0 ? 'Get credits with points' : 'Pay'}
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
