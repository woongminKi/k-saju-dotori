import type { Metadata } from 'next';
import Link from 'next/link';
import { decodeCouple, normalizeBirthFields } from '../../../../lib/birth-params';
import { computeCompatScore, computeCoupleMenu } from '../../../../lib/engine';
import { getAuth, getStore } from '../../../../lib/services';
import { resolveReading } from '../../../../lib/reading-flow';
import { MenuResultView } from '../../../../components/MenuResultView';
import { RateLimitNotice } from '../../../../components/RateLimitNotice';
import { CompatScoreCard } from '../../../../components/CompatScoreCard';
import { buttonClass } from '../../../../components/ui/Button';

export const metadata: Metadata = { title: 'Compatibility Score' };

export default async function CompatResultPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const qp = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) =>
      v === undefined ? [] : Array.isArray(v) ? v.map((x) => [k, x] as [string, string]) : [[k, v] as [string, string]],
    ),
  );

  let pair;
  try {
    pair = decodeCouple(qp);
  } catch (e) {
    return (
      <section className="space-y-4">
        <p className="text-red-600">{e instanceof Error ? e.message : 'Invalid input'}</p>
        <Link href="/menu/compat" className="text-acorn underline">Re-enter</Link>
      </section>
    );
  }

  const score = computeCompatScore(pair.person, pair.partner);
  const user = await getAuth().getCurrentUser();

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-extrabold text-acorn-dark">Compatibility score</h1>
      <CompatScoreCard score={score} />

      <div className="space-y-3 border-t border-line pt-4">
        <h2 className="text-lg font-semibold text-acorn-dark">Detailed compatibility reading</h2>
        {await renderReading(user?.id, pair, `/menu/compat/result?${qp.toString()}`)}
      </div>
    </section>
  );
}

async function renderReading(
  userId: string | undefined,
  pair: { person: ReturnType<typeof decodeCouple>['person']; partner: ReturnType<typeof decodeCouple>['partner'] },
  backTo: string,
) {
  if (!userId) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-bark/70">Log in to see the detailed reading.</p>
        <Link href={`/login?next=${encodeURIComponent(backTo)}`} className={buttonClass('primary')}>Log in</Link>
      </div>
    );
  }

  const outcome = await resolveReading({
    store: getStore(),
    userId,
    menu: 'compat',
    normalizedInput: `${normalizeBirthFields(pair.person)}#${normalizeBirthFields(pair.partner)}`,
    computeUnlocked: () => computeCoupleMenu(pair.person, pair.partner, { unlocked: true }),
  });

  if (outcome.kind === 'insufficient') {
    return (
      <div className="space-y-2">
        <p className="text-sm text-bark/70">The detailed reading needs 1 credit.</p>
        <Link href="/checkout" className={buttonClass('primary')}>Get credits</Link>
      </div>
    );
  }
  if (outcome.kind === 'rateLimited') {
    return <RateLimitNotice />;
  }
  if (outcome.kind === 'failed') {
    return <p className="text-sm text-amber-600">The reading didn&apos;t generate. You weren&apos;t charged — try again in a moment.</p>;
  }
  return <MenuResultView result={outcome.result} />;
}
