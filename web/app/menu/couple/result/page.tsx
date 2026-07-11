import Link from 'next/link';
import { decodeCouple, normalizeBirthFields } from '../../../../lib/birth-params';
import { computeCoupleMenu } from '../../../../lib/engine';
import { getAuth, getStore } from '../../../../lib/services';
import { resolveReading } from '../../../../lib/reading-flow';
import { MenuResultView } from '../../../../components/MenuResultView';
import { MenuTeaser } from '../../../../components/MenuTeaser';

export default async function CoupleResultPage({
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
        <Link href="/menu/couple" className="text-acorn hover:underline">Re-enter</Link>
      </section>
    );
  }

  const user = await getAuth().getCurrentUser();
  if (!user) {
    return (
      <section className="space-y-4">
        <p className="text-bark">Please log in first.</p>
        <Link href="/" className="text-acorn hover:underline">Go home</Link>
      </section>
    );
  }

  const outcome = await resolveReading({
    store: getStore(),
    userId: user.id,
    menu: 'couple',
    normalizedInput: `${normalizeBirthFields(pair.person)}#${normalizeBirthFields(pair.partner)}`,
    computeUnlocked: () => computeCoupleMenu(pair.person, pair.partner, { unlocked: true }),
  });

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-extrabold text-acorn-dark">Couple compatibility</h1>
      {outcome.kind === 'insufficient' ? (
        <MenuTeaser menu="couple" />
      ) : outcome.kind === 'failed' ? (
        <p className="text-sm text-amber-600">The reading didn&apos;t generate. You weren&apos;t charged — try again in a moment.</p>
      ) : (
        <MenuResultView result={outcome.result} />
      )}
    </section>
  );
}
