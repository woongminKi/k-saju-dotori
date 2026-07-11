import Link from 'next/link';
import type { MenuResult } from '@engine/menus/types';
import type { OracleDraw } from '@engine/oracle';
import { getAuth, getStore } from '../../../lib/services';
import { MenuResultView } from '../../../components/MenuResultView';
import { Card } from '../../../components/ui/Card';

/** Saved oracle draws are stored as OracleDraw (no sections) — a dedicated render. */
function OracleReadingView({ draw }: { draw: OracleDraw }) {
  return (
    <div className="space-y-4">
      <Card className="p-6">
        <p className="mb-3 text-sm text-bark/60">{draw.question}</p>
        <p className="text-xl font-extrabold text-acorn-dark">{draw.answer}</p>
      </Card>
      {draw.reason && (
        <Card className="p-6">
          <p className="whitespace-pre-line leading-relaxed text-bark">{draw.reason}</p>
        </Card>
      )}
    </div>
  );
}

function isMenuResult(v: unknown): v is MenuResult {
  return typeof v === 'object' && v !== null && Array.isArray((v as { sections?: unknown }).sections);
}

export default async function ReadingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuth().getCurrentUser();
  if (!user) {
    return (
      <section className="space-y-4">
        <p className="text-bark/70">Please log in first.</p>
        <Link href="/" className="text-acorn underline">Go home</Link>
      </section>
    );
  }

  const reading = await getStore().getReadingById(id);
  if (!reading || reading.userId !== user.id || reading.expiresAt <= Date.now()) {
    return (
      <section className="space-y-4">
        <p className="text-bark/70">We couldn&apos;t find that reading — it may have passed its 30-day window.</p>
        <Link href="/library" className="text-acorn underline">Back to history</Link>
      </section>
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(reading.resultJson);
  } catch {
    parsed = null;
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-extrabold text-acorn-dark">Saved reading</h1>
      {reading.menu === 'oracle' ? (
        <OracleReadingView draw={parsed as OracleDraw} />
      ) : isMenuResult(parsed) ? (
        <MenuResultView result={parsed} />
      ) : (
        <p className="text-bark/70">We can&apos;t display this reading. Try again in a moment.</p>
      )}
      <Link href="/library" className="text-acorn underline">Back to history</Link>
    </section>
  );
}
