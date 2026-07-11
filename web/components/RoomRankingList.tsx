import Link from 'next/link';
import type { CompatRoomEntry } from '../lib/store';
import { buttonClass } from './ui/Button';

function medal(rank: number): string {
  return rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`;
}

export function RoomRankingList({ entries, roomId }: { entries: CompatRoomEntry[]; roomId: string }) {
  if (entries.length === 0) {
    return <p className="text-sm text-bark/70">No friends have joined yet. Share your link!</p>;
  }
  return (
    <ol className="space-y-2">
      {entries.map((e, i) => (
        <li key={e.id} className="flex items-center justify-between rounded-xl border border-line bg-card p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <span className="w-8 text-center text-lg">{medal(i)}</span>
            <div className="font-semibold text-bark">{e.nickname}</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-acorn-dark">{e.score}</span>
            <Link href={`/menu/compat/room/${roomId}?entry=${e.id}`} className={buttonClass('secondary', 'sm')}>
              View reading
            </Link>
          </div>
        </li>
      ))}
    </ol>
  );
}
