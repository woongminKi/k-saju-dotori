'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { buttonClass } from './ui/Button';
import { extendRoomAction, deleteRoomAction } from '../app/library/actions';

/** Extend/reopen + delete buttons for a room. Shared by /library items and the host dashboard. */
export function RoomActions({ roomId, expired }: { roomId: string; expired: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          className={buttonClass('secondary', 'sm')}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const res = await extendRoomAction(roomId);
              if (res) setError(res.error);
              else router.refresh();
            })
          }
        >
          {expired ? 'Reopen' : 'Extend'}
        </button>
        <button
          type="button"
          disabled={pending}
          className={buttonClass('ghost', 'sm')}
          onClick={() => {
            if (!window.confirm('This deletes the room and everyone\'s entries. Delete it?')) return;
            startTransition(async () => {
              setError(null);
              const res = await deleteRoomAction(roomId); // on success the server redirect handles navigation
              if (res) setError(res.error);
            });
          }}
        >
          Delete
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
