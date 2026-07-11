import type { Metadata } from 'next';
import Link from 'next/link';
import { getAuth, getStore } from '../../../../../lib/services';
import { resolveEntryReading } from '../../../../../lib/rooms';
import { RoomRankingList } from '../../../../../components/RoomRankingList';
import { MenuResultView } from '../../../../../components/MenuResultView';
import { CopyButton } from '../../../../invite/CopyButton';
import { ShareButton } from '../../../../../components/ShareButton';
import { RoomActions } from '../../../../../components/RoomActions';
import { buttonClass } from '../../../../../components/ui/Button';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Compatibility Room' };

export default async function RoomDashboardPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const store = getStore();
  const room = await store.getRoom(id);
  if (!room) {
    return (
      <section className="space-y-4">
        <p className="text-bark/70">This room has expired or doesn&apos;t exist.</p>
        <Link href="/" className="text-acorn underline">Go home</Link>
      </section>
    );
  }
  const user = await getAuth().getCurrentUser();
  if (!user || user.id !== room.hostUserId) {
    return (
      <section className="space-y-4">
        <p className="text-bark/70">Only the person who made this room can view it.</p>
        <Link href={`/menu/compat/room/${id}/join`} className="text-acorn underline">Join instead</Link>
      </section>
    );
  }

  const entries = await store.roomEntries(id);
  const siteUrl = process.env['NEXT_PUBLIC_SITE_URL'] ?? '';
  const shareUrl = `${siteUrl}/menu/compat/room/${id}/join`;

  const entryId = typeof sp['entry'] === 'string' ? sp['entry'] : undefined;
  const selected = entryId ? entries.find((e) => e.id === entryId) : undefined;

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-extrabold text-acorn-dark">Compatibility room</h1>
      <div className="space-y-2 rounded-xl bg-sand p-4">
        <div className="text-sm text-bark/70">Link to share with friends</div>
        <ShareButton
          url={shareUrl}
          title="Dotori compatibility room"
          text="How well do we match? Pop in your birthday and see our compatibility score!"
        />
        <CopyButton text={shareUrl} label="Copy invite link" />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card p-4 shadow-soft">
        <span className="text-sm text-bark/70">
          {`${Math.ceil((room.expiresAt - Date.now()) / (24 * 60 * 60 * 1000))} days left · until ${new Date(room.expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`}
        </span>
        <RoomActions roomId={id} expired={false} />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-acorn-dark">Friend compatibility ranking</h2>
        <RoomRankingList entries={entries} roomId={id} />
      </div>

      {selected && (
        <div className="space-y-3 border-t border-line pt-4">
          <h2 className="text-lg font-semibold text-acorn-dark">Detailed reading with {selected.nickname}</h2>
          {await renderEntryReading(store, room, selected)}
        </div>
      )}
    </section>
  );
}

async function renderEntryReading(
  store: Parameters<typeof resolveEntryReading>[0],
  room: Parameters<typeof resolveEntryReading>[1],
  entry: Parameters<typeof resolveEntryReading>[2],
) {
  const outcome = await resolveEntryReading(store, room, entry);
  if (outcome.kind === 'insufficient') {
    return (
      <div className="space-y-2">
        <p className="text-sm text-bark/70">The detailed reading needs 1 credit.</p>
        <Link href="/checkout" className={buttonClass('primary')}>Get credits</Link>
      </div>
    );
  }
  if (outcome.kind === 'failed') {
    return <p className="text-sm text-amber-600">The reading didn&apos;t generate. You weren&apos;t charged — try again in a moment.</p>;
  }
  return <MenuResultView result={outcome.result} />;
}
