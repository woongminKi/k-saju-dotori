import 'server-only';
import { randomUUID } from 'node:crypto';
import type { MenuResult } from '@engine/menus/types';
import type { CompatScore } from '@engine/compatibility';
import type { Store, CompatRoom, CompatRoomEntry } from './store';
import type { BirthFields } from './birth-params';
import { normalizeBirthFields } from './birth-params';
import { encryptPII, decryptPII } from './pii';
import { computeCompatScore, computeCoupleMenu } from './engine';
import { resolveReading, type ReadingOutcome } from './reading-flow';
import { ROOM_SWEEP_GRACE_MS } from './retention';

export const ROOM_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ROOM_ENTRIES = 100;

export async function createRoomForHost(
  store: Store, hostUserId: string, birth: BirthFields, now = Date.now(), hostName?: string,
): Promise<CompatRoom> {
  const room: CompatRoom = {
    id: randomUUID(),
    hostUserId,
    hostName,
    hostBirthEncrypted: encryptPII(JSON.stringify(birth)),
    createdAt: now,
    expiresAt: now + ROOM_TTL_MS,
  };
  await store.createRoom(room);
  return room;
}

export async function submitEntry(
  store: Store, roomId: string, nickname: string, birth: BirthFields, now = Date.now(),
): Promise<{ score: CompatScore; entryId: string }> {
  const trimmed = nickname.trim();
  if (trimmed === '') throw new Error('Please enter a nickname.');
  const room = await store.getRoom(roomId, now);
  if (!room) throw new Error('This room has expired or does not exist.');
  const entries = await store.roomEntries(roomId);
  const existing = entries.find((e) => e.nickname === trimmed);
  // TOCTOU: the read->write race on the count is acceptable at friend-room scale. The unique constraint is the final guard.
  if (!existing && entries.length >= MAX_ROOM_ENTRIES) throw new Error('This room is full.');
  const hostBirth = JSON.parse(decryptPII(room.hostBirthEncrypted)) as BirthFields;
  const score = computeCompatScore(hostBirth, birth);
  const entry: CompatRoomEntry = {
    id: randomUUID(),
    roomId,
    nickname: trimmed,
    guestBirthEncrypted: encryptPII(JSON.stringify(birth)),
    score: score.score,
    createdAt: now,
  };
  await store.addRoomEntry(entry);
  return { score, entryId: entry.id };
}

/** Purchase/view the detailed reading under the given userId. Decrypt entry + host births -> reuse resolveReading. */
export async function resolveEntryReadingFor(
  store: Store, room: CompatRoom, entry: CompatRoomEntry, userId: string,
): Promise<ReadingOutcome> {
  const hostBirth = JSON.parse(decryptPII(room.hostBirthEncrypted)) as BirthFields;
  const guestBirth = JSON.parse(decryptPII(entry.guestBirthEncrypted)) as BirthFields;
  return resolveReading({
    store,
    userId,
    menu: 'compat',
    normalizedInput: `${normalizeBirthFields(hostBirth)}#${normalizeBirthFields(guestBirth)}`,
    computeUnlocked: (): Promise<MenuResult> => computeCoupleMenu(hostBirth, guestBirth, { unlocked: true }),
  });
}

/** Host-only detailed reading. Delegated to the host account. */
export async function resolveEntryReading(
  store: Store, room: CompatRoom, entry: CompatRoomEntry,
): Promise<ReadingOutcome> {
  return resolveEntryReadingFor(store, room, entry, room.hostUserId);
}

/** Recompute an entry's compat score+tier (deterministic, free). For showing score context on the detail page. */
export function compatScoreForEntry(room: CompatRoom, entry: CompatRoomEntry): CompatScore {
  const hostBirth = JSON.parse(decryptPII(room.hostBirthEncrypted)) as BirthFields;
  const guestBirth = JSON.parse(decryptPII(entry.guestBirthEncrypted)) as BirthFields;
  return computeCompatScore(hostBirth, guestBirth);
}

/** Extend/reopen a room — before or after expiry, expiresAt = now + 7 days. Ownership enforced via roomsForHost. */
export async function extendRoomForHost(
  store: Store, userId: string, roomId: string, now = Date.now(),
): Promise<CompatRoom> {
  const room = (await store.roomsForHost(userId)).find((r) => r.id === roomId);
  if (!room) throw new Error('This is not a room you created.');
  if (room.expiresAt + ROOM_SWEEP_GRACE_MS <= now) throw new Error('This room was deleted. Please create a new one.');
  const expiresAt = now + ROOM_TTL_MS;
  await store.setRoomExpiry(roomId, expiresAt);
  return { ...room, expiresAt };
}

/** Delete a room (including entries) — ownership checked. */
export async function deleteRoomForHost(store: Store, userId: string, roomId: string): Promise<void> {
  const room = (await store.roomsForHost(userId)).find((r) => r.id === roomId);
  if (!room) throw new Error('This is not a room you created.');
  await store.deleteRoom(roomId);
}

/** Whitelist of room-management error messages safe to show the user. Anything else maps to a generic message. */
const USER_ROOM_ERRORS = new Set([
  'This is not a room you created.',
  'This room was deleted. Please create a new one.',
]);

export function toUserRoomError(e: unknown): string {
  if (e instanceof Error && USER_ROOM_ERRORS.has(e.message)) return e.message;
  return 'Something went wrong. Please try again in a moment.';
}
