import Link from 'next/link';
import { buttonClass } from './ui/Button';

/** Public /s/[id] card — Phase-6 scope reduction: a generic, honest brand card (no character or
 *  compatibility-tier copy, which the engine doesn't expose in English yet). */
export function ShareCardView({
  cta,
}: {
  cta: { href: string; label: string };
}) {
  return (
    <section className="space-y-6">
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
      <Link href={cta.href} className={buttonClass('primary', 'md', 'block w-full text-center')}>
        {cta.label}
      </Link>
    </section>
  );
}
