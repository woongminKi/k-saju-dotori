import 'server-only';
import type { Store } from './store';

/** Expired-room sweep grace — within this window a host can reopen a room from /library. */
export const ROOM_SWEEP_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export interface SweepResult {
  deleted: number;            // expired readings
  roomsDeleted: number;       // compat rooms past expiry + grace
  shareCardsDeleted: number;  // expired share cards
}

/** Delete readings/share cards past expiresAt + compat rooms (and entries) past expiry+grace. Readings bump the per-menu count. */
export async function sweepExpired(store: Store, now: number = Date.now()): Promise<SweepResult> {
  const all = await store.allReadings();
  let deleted = 0;
  for (const r of all) {
    if (r.expiresAt <= now) {
      await store.incrementMenuCount(r.menu);
      await store.deleteReading(r.id);
      deleted++;
    }
  }
  let roomsDeleted = 0;
  for (const room of await store.allRooms()) {
    if (room.expiresAt + ROOM_SWEEP_GRACE_MS <= now) {
      await store.deleteRoom(room.id);
      roomsDeleted++;
    }
  }
  const shareCardsDeleted = await store.deleteExpiredShareCards(now);
  return { deleted, roomsDeleted, shareCardsDeleted };
}
