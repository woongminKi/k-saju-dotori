'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { track } from '@vercel/analytics/server';
import { getAuth, getStore } from '../../lib/services';
import { extendRoomForHost, deleteRoomForHost, toUserRoomError } from '../../lib/rooms';

export type RoomActionState = { error: string } | null;

/** Extend/reopen a room — failures return a message (no throw). Revalidates /library on success. */
export async function extendRoomAction(roomId: string): Promise<RoomActionState> {
  const user = await getAuth().getCurrentUser();
  if (!user) return { error: 'Please log in first.' };
  try {
    await extendRoomForHost(getStore(), user.id, roomId);
  } catch (e) {
    return { error: toUserRoomError(e) };
  }
  await track('room_extend').catch(() => {});
  revalidatePath('/library');
  return null;
}

/** Delete a room — on success, navigate to /library (also when called from the dashboard).
 *  redirect() throws, so it's outside the try. */
export async function deleteRoomAction(roomId: string): Promise<RoomActionState> {
  const user = await getAuth().getCurrentUser();
  if (!user) return { error: 'Please log in first.' };
  try {
    await deleteRoomForHost(getStore(), user.id, roomId);
  } catch (e) {
    return { error: toUserRoomError(e) };
  }
  redirect('/library');
}
