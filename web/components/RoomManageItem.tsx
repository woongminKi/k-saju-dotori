import Link from 'next/link';
import { RoomActions } from './RoomActions';

/** A compat-room item in /library. Date/badge labels are computed server-side and passed as strings. */
export function RoomManageItem({
  roomId, createdLabel, badgeLabel, expired, entryCount,
}: {
  roomId: string;
  createdLabel: string;
  badgeLabel: string;
  expired: boolean;
  entryCount: number;
}) {
  return (
    <li className="space-y-2 rounded-xl border border-line bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        {expired ? (
          <span className="font-medium text-bark/60">{createdLabel}</span>
        ) : (
          <Link href={`/menu/compat/room/${roomId}`} className="font-medium text-bark hover:underline">
            {createdLabel}
          </Link>
        )}
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            expired ? 'bg-line text-bark/60' : 'bg-sand text-acorn-dark'
          }`}
        >
          {badgeLabel}
        </span>
      </div>
      <div className="text-sm text-bark/60">{entryCount} joined</div>
      <RoomActions roomId={roomId} expired={expired} />
    </li>
  );
}
