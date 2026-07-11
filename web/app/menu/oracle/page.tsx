import Link from 'next/link';
import type { Metadata } from 'next';
import { getAuth } from '../../../lib/services';
import { OracleExperience } from '../../../components/OracleExperience';
import { buttonClass } from '../../../components/ui/Button';

export const metadata: Metadata = {
  title: 'Acorn oracle — pull today’s answer',
  description: 'Pick what’s on your mind and the squirrel pulls an answer from inside an acorn. Two free draws a day — a little daily fortune.',
};

export const dynamic = 'force-dynamic';

export default async function OraclePage() {
  const user = await getAuth().getCurrentUser().catch(() => undefined);

  return (
    <section className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-extrabold text-acorn-dark">🐿️ Acorn oracle</h1>
        <p className="text-sm text-bark/70">Pick what&apos;s on your mind and Dotori shakes the jar to pull an acorn with your answer. (2 free draws)</p>
      </div>
      {!user ? (
        <div className="space-y-3 text-center">
          <p className="text-sm text-bark/70">Log in to draw an acorn.</p>
          <Link href="/login?next=/menu/oracle" className={buttonClass('primary')}>Log in and draw</Link>
        </div>
      ) : (
        <OracleExperience />
      )}
    </section>
  );
}
