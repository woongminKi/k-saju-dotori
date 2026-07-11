// Streaming reading view — server components only (no 'use client': section promises are props).
// /menu/solo progressively renders modules with Suspense as each finishes.
import type { MenuSection } from '@engine/menus/types';
import type { FinalizeOutcome } from '../lib/reading-flow';
import { Card } from './ui/Card';

export function SectionSkeleton({ title, badge }: { title: string; badge?: string }) {
  return (
    <Card className="p-6">
      <div className="mb-2 flex items-center gap-2">
        {badge && (
          <span className="rounded-full bg-acorn/10 px-2 py-0.5 text-xs font-semibold text-acorn-dark">
            {badge}
          </span>
        )}
        <h2 className="font-bold text-acorn-dark">{title}</h2>
      </div>
      <div className="animate-pulse space-y-2" aria-label="Generating reading">
        <div className="h-4 rounded bg-sand" />
        <div className="h-4 rounded bg-sand" />
        <div className="h-4 w-2/3 rounded bg-sand" />
      </div>
    </Card>
  );
}

export async function AwaitedSection({
  section,
  badge,
}: {
  section: Promise<MenuSection>;
  badge?: string;
}) {
  const s = await section;
  return (
    <Card className={badge ? 'p-6 border-acorn/30' : 'p-6'}>
      <div className="mb-2 flex items-center gap-2">
        {badge && (
          <span className="rounded-full bg-acorn/10 px-2 py-0.5 text-xs font-semibold text-acorn-dark">
            {badge}
          </span>
        )}
        <h2 className="font-bold text-acorn-dark">{s.title}</h2>
      </div>
      {s.ok && s.body ? (
        <p className="whitespace-pre-line leading-relaxed text-bark">{s.body}</p>
      ) : (
        <p className="text-sm text-bark/60">This part didn&apos;t generate. Try again in a moment.</p>
      )}
    </Card>
  );
}

/** Runs the charge/save after full generation; only renders a notice on failure. */
export async function FinalizeNotice({
  finalize,
}: {
  finalize: () => Promise<FinalizeOutcome>;
}) {
  try {
    const out = await finalize();
    if (out.kind === 'failed') {
      return (
        <p className="text-sm text-amber-600">
          The reading didn&apos;t generate. You weren&apos;t charged — try again in a moment.
        </p>
      );
    }
    return null;
  } catch {
    // Save failed -> refund already issued. The reading is on screen, so just explain.
    return (
      <p className="text-sm text-amber-600">
        We couldn&apos;t save your reading, so your credit was refunded. You can still read what&apos;s on
        screen, but reopening it will need a fresh generation.
      </p>
    );
  }
}
