import Link from 'next/link';
import { buttonClass } from '../components/ui/Button';

export default function LandingPage() {
  return (
    <section className="flex flex-col items-center gap-8 py-8 text-center">
      <div className="relative flex h-56 w-56 items-center justify-center rounded-full bg-sand">
        <svg
          viewBox="0 0 224 224"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <path id="dotori-arc" d="M 26 112 A 86 86 0 0 1 198 112" fill="none" />
          </defs>
          <text fill="#5C3B1E" fontSize="22" fontWeight="800" letterSpacing="6">
            <textPath href="#dotori-arc" startOffset="50%" textAnchor="middle">
              DOTORI
            </textPath>
          </text>
        </svg>
        <span aria-hidden="true" className="text-7xl">🌰</span>
      </div>
      <div className="space-y-3">
        <h1 className="text-3xl font-extrabold text-acorn-dark">
          Your Korean fortune, one acorn at a time.
        </h1>
        <p className="text-bark/70">
          Pop in your birthday and Dotori reads your saju — no crystal ball required.
        </p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <Link href="/input" className={buttonClass('primary')}>
          Read my fortune
        </Link>
        <Link href="/menu/oracle" className={buttonClass('secondary', 'sm')}>
          🐿️ Draw an acorn oracle
        </Link>
        <Link href="/menu/compat" className={buttonClass('secondary', 'sm')}>
          Check your compatibility
        </Link>
      </div>
    </section>
  );
}
