import Link from 'next/link';
import { getAuth, getStore } from '../../lib/services';
import { RoomManageItem } from '../../components/RoomManageItem';
import { ROOM_SWEEP_GRACE_MS } from '../../lib/retention';
import { buttonClass } from '../../components/ui/Button';

const MENU_LABELS: Record<string, string> = {
  solo: 'Full saju reading',
  'love-marriage': 'Love & Marriage',
  career: 'Career & Calling',
  couple: 'Couple compatibility',
  compat: 'Compatibility',
  oracle: '🐿️ Acorn oracle',
};

const DAY_MS = 24 * 60 * 60 * 1000;

function roomBadge(expiresAt: number, now: number): { expired: boolean; label: string } {
  if (expiresAt > now) return { expired: false, label: `${Math.ceil((expiresAt - now) / DAY_MS)} days left` };
  const deleteInDays = Math.max(1, Math.ceil((expiresAt + ROOM_SWEEP_GRACE_MS - now) / DAY_MS));
  return { expired: true, label: `Expired · deletes in ${deleteInDays} days` };
}

export default async function LibraryPage() {
  const user = await getAuth().getCurrentUser();
  if (!user) {
    return (
      <section className="space-y-4">
        <p className="text-bark/70">Please log in first.</p>
        <Link href="/" className="text-acorn underline">Go home</Link>
      </section>
    );
  }

  const now = Date.now();
  const store = getStore();
  const readings = (await store.readingsFor(user.id))
    .filter((r) => r.expiresAt > now)
    .sort((a, b) => b.createdAt - a.createdAt);

  const rooms = await Promise.all(
    (await store.roomsForHost(user.id))
      .filter((room) => room.expiresAt + ROOM_SWEEP_GRACE_MS > now)
      .map(async (room) => ({
        room,
        entryCount: (await store.roomEntries(room.id)).length,
      })),
  );

  return (
    <section className="space-y-6 text-center">
      <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-sand">
        <span aria-hidden="true" className="text-6xl">🌰</span>
      </div>
      <h1 className="text-2xl font-extrabold text-acorn-dark">Your reading history</h1>
      {readings.length === 0 ? (
        <p className="text-bark/70">No readings yet.</p>
      ) : (
        <ul className="space-y-3 text-left">
          {readings.map((r) => (
            <li key={r.id} className="rounded-xl border border-line bg-card p-4 shadow-soft">
              <Link href={`/reading/${r.id}`} className="flex items-center justify-between">
                <span className="font-medium text-bark">{MENU_LABELS[r.menu] ?? r.menu}</span>
                <span className="text-sm text-bark/60">
                  until {new Date(r.expiresAt).toLocaleDateString('en-US')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-acorn-dark">Your compatibility rooms</h2>
        {rooms.length === 0 ? (
          <div className="space-y-2">
            <p className="text-bark/70">You haven&apos;t made any rooms.</p>
            <Link href="/menu/compat/room/new" className={buttonClass('secondary', 'sm', 'inline-block')}>
              Make a group compatibility room
            </Link>
          </div>
        ) : (
          <ul className="space-y-3 text-left">
            {rooms.map(({ room, entryCount }) => {
              const badge = roomBadge(room.expiresAt, now);
              return (
                <RoomManageItem
                  key={room.id}
                  roomId={room.id}
                  createdLabel={`Room from ${new Date(room.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`}
                  badgeLabel={badge.label}
                  expired={badge.expired}
                  entryCount={entryCount}
                />
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
