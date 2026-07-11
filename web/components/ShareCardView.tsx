import Link from 'next/link';
import { buttonClass } from './ui/Button';
import {
  ELEMENT_ORDER,
  type ElementName,
  type ShareCardPayload,
  type SoloCardPayload,
  type CompatCardPayload,
} from '../lib/share-cards';

const ELEMENT_BAR_COLOR: Record<ElementName, string> = {
  Wood: '#7FA35A',
  Fire: '#E2735F',
  Earth: '#C98A3C',
  Metal: '#A89F8D',
  Water: '#6E93B8',
};

function parsePayload(payloadJson: string): ShareCardPayload | null {
  try {
    const p = JSON.parse(payloadJson) as ShareCardPayload;
    if (p && (p.kind === 'solo' || p.kind === 'compat')) return p;
    return null;
  } catch {
    return null;
  }
}

function SoloCard({ p }: { p: SoloCardPayload }) {
  const max = Math.max(...ELEMENT_ORDER.map((n) => p.elements[n]), 1);
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-soft">
      <div className="flex flex-col items-center gap-1 bg-sand p-6 text-center">
        <span aria-hidden="true" className="text-4xl">🌰</span>
        <p className="text-xs font-semibold text-caramel">Your saju character</p>
        <p className="text-2xl font-extrabold text-bark">{p.characterName}</p>
        <p className="text-sm text-acorn">{p.stemLabel}</p>
      </div>
      <div className="space-y-4 p-6">
        <div className="space-y-2">
          {ELEMENT_ORDER.map((name) => (
            <div key={name} className="flex items-center gap-3">
              <span className="w-12 text-xs font-semibold" style={{ color: ELEMENT_BAR_COLOR[name] }}>
                {name}
              </span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-sand">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(6, (p.elements[name] / max) * 100)}%`,
                    background: ELEMENT_BAR_COLOR[name],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-sm italic text-bark/80">&ldquo;{p.line}&rdquo;</p>
      </div>
    </div>
  );
}

function CompatCard({ p }: { p: CompatCardPayload }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-soft">
      <div className="flex flex-col items-center gap-1 bg-sand p-6 text-center">
        <p className="text-xs font-semibold text-caramel">Compatibility score</p>
        <div className="text-5xl font-extrabold text-acorn-dark">{p.score}</div>
        <span className="rounded-full bg-acorn px-4 py-1 text-sm font-semibold text-cream">{p.tier}</span>
      </div>
      <div className="space-y-3 p-6 text-center">
        <p className="text-lg font-bold text-bark">
          {p.hostName ?? 'A friend'} <span className="text-blush">♥</span> {p.guestNickname}
        </p>
        <p className="text-sm italic text-bark/80">&ldquo;{p.line}&rdquo;</p>
      </div>
    </div>
  );
}

/** Generic, honest brand card — shown when a card's payload is missing or malformed (never throws). */
function FallbackCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-soft">
      <div className="flex flex-col items-center gap-2 bg-sand p-8">
        <span aria-hidden="true" className="text-6xl">🌰</span>
        <div className="text-sm font-extrabold text-acorn">Dotori</div>
      </div>
      <div className="space-y-2 p-6 text-center">
        <p className="text-lg font-extrabold text-bark">A friend read their Korean fortune on Dotori</p>
        <p className="text-sm text-bark/70">Your Korean fortune, one acorn at a time.</p>
      </div>
    </div>
  );
}

/** Public /s/[id] card — renders the real solo/compat snapshot; malformed payloads degrade to the
 *  generic brand card instead of throwing. */
export function ShareCardView({
  payloadJson,
  cta,
}: {
  payloadJson: string;
  cta: { href: string; label: string };
}) {
  const payload = parsePayload(payloadJson);
  return (
    <section className="space-y-6">
      {!payload ? (
        <FallbackCard />
      ) : payload.kind === 'solo' ? (
        <SoloCard p={payload} />
      ) : (
        <CompatCard p={payload} />
      )}
      <Link href={cta.href} className={buttonClass('primary', 'md', 'block w-full text-center')}>
        {cta.label}
      </Link>
    </section>
  );
}
