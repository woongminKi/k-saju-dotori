import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuth, getStore } from '../../../../../../lib/services';
import { resolveEntryReadingFor, compatScoreForEntry } from '../../../../../../lib/rooms';
import { CompatScoreCard } from '../../../../../../components/CompatScoreCard';
import { MenuResultView } from '../../../../../../components/MenuResultView';
import { MenuTeaser } from '../../../../../../components/MenuTeaser';
import { ShareCardButton } from '../../../../../../components/ShareCardButton';

export const dynamic = 'force-dynamic';

// Guest paid detailed reading — login + charge on their own account. Score/tier/one-liner were free at join.
export default async function RoomEntryDetailPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const entryId = typeof sp['entry'] === 'string' ? sp['entry'] : undefined;

  // Login required. If not logged in, come back via login?next=.
  const user = await getAuth().getCurrentUser();
  if (!user) {
    const next = `/menu/compat/room/${id}/detail?entry=${entryId ?? ''}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const store = getStore();
  const room = await store.getRoom(id);
  if (!room || !entryId) {
    return (
      <section className="space-y-4">
        <p className="text-bark/70">This compatibility result has expired or doesn&apos;t exist.</p>
        <Link href="/" className="text-acorn underline">Go home</Link>
      </section>
    );
  }

  const entries = await store.roomEntries(id);
  const entry = entries.find((e) => e.id === entryId);
  if (!entry) {
    return (
      <section className="space-y-4">
        <p className="text-bark/70">We couldn&apos;t find that compatibility result.</p>
        <Link href={`/menu/compat/room/${id}/join`} className="text-acorn underline">Join again</Link>
      </section>
    );
  }

  const score = compatScoreForEntry(room, entry);
  const outcome = await resolveEntryReadingFor(store, room, entry, user.id);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-extrabold text-acorn-dark">Detailed compatibility reading</h1>
      <CompatScoreCard score={score} />
      <ShareCardButton
        input={{ kind: 'compat', roomId: id, entryId: entry.id }}
        title="Dotori compatibility"
        text={`We scored ${score.score}/100! Try it 🐿️`}
        label="Share our score card 🐿️"
      />
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
