import { it, expect, beforeEach } from 'vitest';
import type { Store } from '../store';

/** Deterministic ids for the contract tests — the Supabase schema pks are uuid, so ids must be uuid-shaped (name <= 6 chars). */
function uid(name: string): string {
  return `00000000-0000-4000-8000-${Buffer.from(name).toString('hex').padEnd(12, '0')}`;
}

/**
 * Verifies the contract of a Store implementation. makeStore must return a "clean" store on every test.
 * (InMemory: a fresh instance. Supabase: the same instance truncated before the call — beforeEach on the caller side.)
 */
export function runStoreContract(makeStore: () => Store | Promise<Store>): void {
  let s: Store;
  beforeEach(async () => {
    s = await makeStore();
  });

  it('user upsert/get', async () => {
    await s.upsertUser({ id: uid('u1'), createdAt: 1, referralCode: 'DOTORI-AAAA' });
    expect((await s.getUser(uid('u1')))?.id).toBe(uid('u1'));
    expect((await s.getUser(uid('u1')))?.referralCode).toBe('DOTORI-AAAA');
    expect(await s.getUser(uid('nope'))).toBeUndefined();
  });

  it('ledger append/read', async () => {
    await s.appendLedger({ userId: uid('u1'), delta: 3, reason: 'topup', at: 1 });
    await s.appendLedger({ userId: uid('u1'), delta: -1, reason: 'spend', at: 2 });
    await s.appendLedger({ userId: uid('u2'), delta: 1, reason: 'topup', at: 3 });
    expect(await s.ledgerFor(uid('u1'))).toHaveLength(2);
    expect(await s.ledgerFor(uid('u2'))).toHaveLength(1);
    const sum = (await s.ledgerFor(uid('u1'))).reduce((a, e) => a + e.delta, 0);
    expect(sum).toBe(2);
  });

  it('order create/get-by-token/update', async () => {
    await s.createOrder({ id: uid('o1'), userId: uid('u1'), units: 2, amountCents: 1800, currency: 'usd', status: 'pending', pgToken: 'tok', createdAt: 1 });
    expect((await s.getOrderByToken('tok'))?.id).toBe(uid('o1'));
    await s.updateOrder(uid('o1'), { status: 'canceled' });
    expect((await s.getOrder(uid('o1')))?.status).toBe('canceled');
  });

  it('createOrder — a pending order with the same user/product/units/points throws DuplicatePendingOrderError (with existingOrder)', async () => {
    await s.createOrder({
      id: uid('dp1'), userId: uid('u1'), units: 3, amountCents: 2400, currency: 'usd', status: 'pending',
      pgToken: 'dp1', product: 'reading', pointsApplied: 300, createdAt: 1,
    });
    await expect(
      s.createOrder({
        id: uid('dp2'), userId: uid('u1'), units: 3, amountCents: 2400, currency: 'usd', status: 'pending',
        pgToken: 'dp2', product: 'reading', pointsApplied: 300, createdAt: 2,
      }),
    ).rejects.toMatchObject({ name: 'DuplicatePendingOrderError', existingOrder: { id: uid('dp1') } });
    // The rejected second order must not be stored.
    expect(await s.getOrder(uid('dp2'))).toBeUndefined();
  });

  it('createOrder — once the existing order leaves pending (e.g. paid), the same tuple passes', async () => {
    await s.createOrder({
      id: uid('dp3'), userId: uid('u1'), units: 3, amountCents: 2400, currency: 'usd', status: 'pending', pgToken: 'dp3', createdAt: 1,
    });
    await s.markOrderPaid(uid('dp3'));
    await s.createOrder({
      id: uid('dp4'), userId: uid('u1'), units: 3, amountCents: 2400, currency: 'usd', status: 'pending', pgToken: 'dp4', createdAt: 2,
    });
    expect((await s.getOrder(uid('dp4')))?.status).toBe('pending'); // a legitimate re-purchase is not blocked
  });

  it('createOrder — no conflict when any of units/product/pointsApplied differs', async () => {
    await s.createOrder({
      id: uid('dp5'), userId: uid('u1'), units: 3, amountCents: 2400, currency: 'usd', status: 'pending', pgToken: 'dp5', createdAt: 1,
    });
    await s.createOrder({
      id: uid('dp6'), userId: uid('u1'), units: 5, amountCents: 900, currency: 'usd', status: 'pending', product: 'oracle', pgToken: 'dp6', createdAt: 2,
    });
    expect((await s.getOrder(uid('dp6')))?.status).toBe('pending');
  });

  it('markOrderPaid — true only from pending, false on repeat', async () => {
    await s.createOrder({ id: uid('o2'), userId: uid('u1'), units: 1, amountCents: 900, currency: 'usd', status: 'pending', pgToken: 't2', createdAt: 1 });
    expect(await s.markOrderPaid(uid('o2'))).toBe(true);
    expect(await s.markOrderPaid(uid('o2'))).toBe(false);
    expect((await s.getOrder(uid('o2')))?.status).toBe('paid');
  });

  it('markOrderPaid — exactly one true on concurrent calls', async () => {
    await s.createOrder({ id: uid('o3'), userId: uid('u1'), units: 4, amountCents: 2800, currency: 'usd', status: 'pending', pgToken: 't3', createdAt: 1 });
    const results = await Promise.all([s.markOrderPaid(uid('o3')), s.markOrderPaid(uid('o3'))]);
    expect(results.filter((r) => r === true)).toHaveLength(1);
  });

  it('markOrderPaid — throws for a missing order', async () => {
    await expect(s.markOrderPaid(uid('nope'))).rejects.toThrow();
  });

  it('markOrderRefunded — true only from paid, false on repeat, false from pending', async () => {
    await s.createOrder({ id: uid('o4'), userId: uid('u1'), units: 1, amountCents: 900, currency: 'usd', status: 'pending', pgToken: 't4', createdAt: 1 });
    expect(await s.markOrderRefunded(uid('o4'))).toBe(false); // cannot refund while pending
    await s.markOrderPaid(uid('o4'));
    expect(await s.markOrderRefunded(uid('o4'))).toBe(true);
    expect(await s.markOrderRefunded(uid('o4'))).toBe(false);
    expect((await s.getOrder(uid('o4')))?.status).toBe('refunded');
  });

  it('markOrderRefunded — throws for a missing order', async () => {
    await expect(s.markOrderRefunded(uid('nope'))).rejects.toThrow();
  });

  it('markOrderCanceled — true only from pending, false on repeat, false from paid (no overwrite)', async () => {
    await s.createOrder({ id: uid('oc1'), userId: uid('u1'), units: 1, amountCents: 900, currency: 'usd', status: 'pending', pgToken: 'tc1', createdAt: 1 });
    expect(await s.markOrderCanceled(uid('oc1'))).toBe(true);
    expect(await s.markOrderCanceled(uid('oc1'))).toBe(false);
    expect((await s.getOrder(uid('oc1')))?.status).toBe('canceled');

    await s.createOrder({ id: uid('oc2'), userId: uid('u1'), units: 2, amountCents: 1800, currency: 'usd', status: 'pending', pgToken: 'tc2', createdAt: 1 });
    await s.markOrderPaid(uid('oc2'));
    expect(await s.markOrderCanceled(uid('oc2'))).toBe(false); // does not overwrite paid with canceled
    expect((await s.getOrder(uid('oc2')))?.status).toBe('paid');
  });

  it('markOrderCanceled — throws for a missing order', async () => {
    await expect(s.markOrderCanceled(uid('nope'))).rejects.toThrow();
  });

  it('markOrderFailed — true only from pending, false on repeat, false from paid (no overwrite)', async () => {
    await s.createOrder({ id: uid('of1'), userId: uid('u1'), units: 1, amountCents: 900, currency: 'usd', status: 'pending', pgToken: 'tf1', createdAt: 1 });
    expect(await s.markOrderFailed(uid('of1'))).toBe(true);
    expect(await s.markOrderFailed(uid('of1'))).toBe(false);
    expect((await s.getOrder(uid('of1')))?.status).toBe('failed');

    await s.createOrder({ id: uid('of2'), userId: uid('u1'), units: 2, amountCents: 1800, currency: 'usd', status: 'pending', pgToken: 'tf2', createdAt: 1 });
    await s.markOrderPaid(uid('of2'));
    expect(await s.markOrderFailed(uid('of2'))).toBe(false); // does not overwrite paid with failed
    expect((await s.getOrder(uid('of2')))?.status).toBe('paid');
  });

  it('markOrderFailed — throws for a missing order', async () => {
    await expect(s.markOrderFailed(uid('nope'))).rejects.toThrow();
  });

  it('pendingOrdersForUserSince — only this user\'s pending orders with createdAt>=sinceMs, any product', async () => {
    await s.createOrder({ id: uid('pu1'), userId: uid('u1'), units: 1, amountCents: 900, currency: 'usd', status: 'pending', pgToken: 'pu1', product: 'reading', createdAt: 500 });
    await s.createOrder({ id: uid('pu2'), userId: uid('u1'), units: 5, amountCents: 900, currency: 'usd', status: 'pending', product: 'oracle', createdAt: 500 }); // included even without a token
    await s.createOrder({ id: uid('pu3'), userId: uid('u1'), units: 2, amountCents: 1800, currency: 'usd', status: 'pending', pgToken: 'pu3', createdAt: 100 }); // before sinceMs — excluded
    await s.createOrder({ id: uid('pu4'), userId: uid('u1'), units: 1, amountCents: 900, currency: 'usd', status: 'paid', pgToken: 'pu4', createdAt: 500 }); // paid — excluded
    await s.createOrder({ id: uid('pu5'), userId: uid('u2'), units: 1, amountCents: 900, currency: 'usd', status: 'pending', pgToken: 'pu5', createdAt: 500 }); // different user — excluded

    const orders = await s.pendingOrdersForUserSince(uid('u1'), 300);
    expect(orders.map((o) => o.id).sort()).toEqual([uid('pu1'), uid('pu2')].sort());
  });

  it('pendingOrdersOlderThan — only pending orders with a token at or below cutoff, ascending by createdAt', async () => {
    await s.createOrder({ id: uid('o5'), userId: uid('u1'), units: 1, amountCents: 900, currency: 'usd', status: 'pending', pgToken: 't5', createdAt: 200 });
    await s.createOrder({ id: uid('o6'), userId: uid('u1'), units: 2, amountCents: 1800, currency: 'usd', status: 'pending', pgToken: 't6', createdAt: 100 });
    await s.createOrder({ id: uid('o7'), userId: uid('u1'), units: 3, amountCents: 2400, currency: 'usd', status: 'pending', pgToken: 't7', createdAt: 900 }); // after cutoff — excluded
    await s.createOrder({ id: uid('o8'), userId: uid('u1'), units: 1, amountCents: 900, currency: 'usd', status: 'paid', pgToken: 't8', createdAt: 100 }); // paid — excluded (not pending, not a dedup target)
    await s.createOrder({ id: uid('o9'), userId: uid('u1'), units: 4, amountCents: 2800, currency: 'usd', status: 'pending', createdAt: 100 }); // no token — excluded

    const orders = await s.pendingOrdersOlderThan(300);
    expect(orders.map((o) => o.id)).toEqual([uid('o6'), uid('o5')]); // ascending by createdAt
  });

  it('pendingOrdersOlderThan — applies limit', async () => {
    await s.createOrder({ id: uid('oa'), userId: uid('u1'), units: 1, amountCents: 900, currency: 'usd', status: 'pending', pgToken: 'ta', createdAt: 100 });
    await s.createOrder({ id: uid('ob'), userId: uid('u1'), units: 2, amountCents: 1800, currency: 'usd', status: 'pending', pgToken: 'tb', createdAt: 200 });
    const orders = await s.pendingOrdersOlderThan(300, 1);
    expect(orders).toHaveLength(1);
  });

  it('reading save/find/delete', async () => {
    const r = { id: uid('r1'), userId: uid('u1'), menu: 'solo', birthHash: 'h', encryptedInputs: 'x', resultJson: '{"a":1}', createdAt: 1, expiresAt: 100 };
    await s.saveReading(r);
    expect((await s.findReading(uid('u1'), 'solo', 'h'))?.id).toBe(uid('r1'));
    expect((await s.getReadingById(uid('r1')))?.resultJson).toBe('{"a":1}');
    expect(await s.readingsFor(uid('u1'))).toHaveLength(1);
    expect(await s.allReadings()).toHaveLength(1);
    await s.deleteReading(uid('r1'));
    expect(await s.findReading(uid('u1'), 'solo', 'h')).toBeUndefined();
    expect(await s.getReadingById(uid('nope'))).toBeUndefined();
  });

  it('menu tally counter increments atomically', async () => {
    await s.incrementMenuCount('solo');
    await s.incrementMenuCount('solo');
    await s.incrementMenuCount('couple');
    expect(await s.menuCounts()).toEqual({ solo: 2, couple: 1 });
  });

  it('getUserByReferralCode — lookup by code', async () => {
    await s.upsertUser({ id: uid('u1'), createdAt: 1, referralCode: 'DOTORI-CODE' });
    expect((await s.getUserByReferralCode('DOTORI-CODE'))?.id).toBe(uid('u1'));
    expect(await s.getUserByReferralCode('DOTORI-XXXX')).toBeUndefined();
  });

  it('setReferredBy — true only on the first null->value transition, false on repeat', async () => {
    await s.upsertUser({ id: uid('ref'), createdAt: 1, referralCode: 'DOTORI-REF0' });
    await s.upsertUser({ id: uid('newbie'), createdAt: 2, referralCode: 'DOTORI-NEW0' });
    expect(await s.setReferredBy(uid('newbie'), uid('ref'))).toBe(true);
    expect(await s.setReferredBy(uid('newbie'), uid('ref'))).toBe(false);
    expect((await s.getUser(uid('newbie')))?.referredBy).toBe(uid('ref'));
  });

  it('setReferredBy — exactly one true on concurrent calls', async () => {
    await s.upsertUser({ id: uid('r2'), createdAt: 1, referralCode: 'DOTORI-R200' });
    await s.upsertUser({ id: uid('n2'), createdAt: 2, referralCode: 'DOTORI-N200' });
    const results = await Promise.all([s.setReferredBy(uid('n2'), uid('r2')), s.setReferredBy(uid('n2'), uid('r2'))]);
    expect(results.filter((r) => r === true)).toHaveLength(1);
  });

  it('points ledger append/read — balance = sum of deltas', async () => {
    await s.appendPoints({ userId: uid('u1'), delta: 100, reason: 'referral_referee', ref: 'ref', at: 1 });
    await s.appendPoints({ userId: uid('u1'), delta: -30, reason: 'spend_topup', ref: 'o1', at: 2 });
    await s.appendPoints({ userId: uid('u2'), delta: 100, reason: 'referral_referrer', ref: 'u1', at: 3 });
    expect(await s.pointsFor(uid('u1'))).toHaveLength(2);
    expect(await s.pointsFor(uid('u2'))).toHaveLength(1);
    const sum = (await s.pointsFor(uid('u1'))).reduce((a, e) => a + e.delta, 0);
    expect(sum).toBe(70);
  });

  it('room create/get round-trip', async () => {
    await s.createRoom({ id: uid('room1'), hostUserId: uid('u1'), hostBirthEncrypted: 'enc-host', createdAt: 10, expiresAt: 1000 });
    const got = await s.getRoom(uid('room1'), 100);
    expect(got?.hostUserId).toBe(uid('u1'));
    expect(got?.hostBirthEncrypted).toBe('enc-host');
    expect(await s.getRoom(uid('nope'), 100)).toBeUndefined();
  });

  it('room expiry — undefined when expiresAt <= now', async () => {
    await s.createRoom({ id: uid('room2'), hostUserId: uid('u1'), hostBirthEncrypted: 'x', createdAt: 10, expiresAt: 1000 });
    expect(await s.getRoom(uid('room2'), 999)).toBeDefined();
    expect(await s.getRoom(uid('room2'), 1000)).toBeUndefined();
    expect(await s.getRoom(uid('room2'), 1001)).toBeUndefined();
  });

  it('room entries — score descending, ties broken by createdAt ascending', async () => {
    await s.createRoom({ id: uid('room3'), hostUserId: uid('u1'), hostBirthEncrypted: 'x', createdAt: 10, expiresAt: 1000 });
    await s.addRoomEntry({ id: uid('e1'), roomId: uid('room3'), nickname: 'Amy', guestBirthEncrypted: 'g1', score: 70, createdAt: 1 });
    await s.addRoomEntry({ id: uid('e2'), roomId: uid('room3'), nickname: 'Ben', guestBirthEncrypted: 'g2', score: 90, createdAt: 2 });
    await s.addRoomEntry({ id: uid('e3'), roomId: uid('room3'), nickname: 'Cara', guestBirthEncrypted: 'g3', score: 90, createdAt: 3 });
    const entries = await s.roomEntries(uid('room3'));
    expect(entries.map((e) => e.nickname)).toEqual(['Ben', 'Cara', 'Amy']);
    expect(await s.roomEntries(uid('empty'))).toEqual([]);
  });

  it('addRoomEntry — re-submitting the same nickname overwrites (1 row, latest score)', async () => {
    await s.createRoom({ id: uid('up1'), hostUserId: uid('u1'), hostBirthEncrypted: 'x', createdAt: 10, expiresAt: 1000 });
    await s.addRoomEntry({ id: uid('a1'), roomId: uid('up1'), nickname: 'Amy', guestBirthEncrypted: 'g1', score: 50, createdAt: 1 });
    await s.addRoomEntry({ id: uid('a2'), roomId: uid('up1'), nickname: 'Amy', guestBirthEncrypted: 'g2', score: 80, createdAt: 2 });
    const entries = await s.roomEntries(uid('up1'));
    expect(entries).toHaveLength(1);
    expect(entries[0]!.score).toBe(80);
    expect(entries[0]!.guestBirthEncrypted).toBe('g2');
  });

  it('allRooms — returns everything regardless of expiry', async () => {
    await s.createRoom({ id: uid('ar1'), hostUserId: uid('u1'), hostBirthEncrypted: 'x', createdAt: 10, expiresAt: 50 });
    await s.createRoom({ id: uid('ar2'), hostUserId: uid('u1'), hostBirthEncrypted: 'x', createdAt: 10, expiresAt: 9999 });
    const ids = (await s.allRooms()).map((r) => r.id);
    expect(ids).toContain(uid('ar1'));
    expect(ids).toContain(uid('ar2'));
  });

  it('deleteRoom — deletes the room + its entries, preserves other rooms', async () => {
    await s.createRoom({ id: uid('d1'), hostUserId: uid('u1'), hostBirthEncrypted: 'x', createdAt: 10, expiresAt: 9999 });
    await s.createRoom({ id: uid('d2'), hostUserId: uid('u1'), hostBirthEncrypted: 'x', createdAt: 10, expiresAt: 9999 });
    await s.addRoomEntry({ id: uid('de1'), roomId: uid('d1'), nickname: 'A', guestBirthEncrypted: 'g', score: 10, createdAt: 1 });
    await s.addRoomEntry({ id: uid('de2'), roomId: uid('d2'), nickname: 'B', guestBirthEncrypted: 'g', score: 20, createdAt: 1 });
    await s.deleteRoom(uid('d1'));
    expect(await s.getRoom(uid('d1'), 100)).toBeUndefined();
    expect(await s.roomEntries(uid('d1'))).toEqual([]);
    expect(await s.getRoom(uid('d2'), 100)).toBeDefined();
    expect(await s.roomEntries(uid('d2'))).toHaveLength(1);
  });

  it('roomsForHost — all rooms including expired, excludes other users, createdAt desc', async () => {
    await s.createRoom({ id: uid('rh1'), hostUserId: uid('u1'), hostBirthEncrypted: 'x', createdAt: 10, expiresAt: 100 });
    await s.createRoom({ id: uid('rh2'), hostUserId: uid('u1'), hostBirthEncrypted: 'x', createdAt: 20, expiresAt: 99999 });
    await s.createRoom({ id: uid('rh3'), hostUserId: uid('u2'), hostBirthEncrypted: 'x', createdAt: 30, expiresAt: 99999 });
    const rooms = await s.roomsForHost(uid('u1'));
    expect(rooms.map((r) => r.id)).toEqual([uid('rh2'), uid('rh1')]); // desc + expired rh1 included
    expect(await s.roomsForHost(uid('nope'))).toEqual([]);
  });

  it('setRoomExpiry — reflects the update, throws for a missing room', async () => {
    await s.createRoom({ id: uid('re1'), hostUserId: uid('u1'), hostBirthEncrypted: 'x', createdAt: 10, expiresAt: 100 });
    await s.setRoomExpiry(uid('re1'), 5000);
    expect((await s.getRoom(uid('re1'), 1000))?.expiresAt).toBe(5000); // was expired, now revived
    await expect(s.setRoomExpiry(uid('nope'), 5000)).rejects.toThrow();
  });

  it('share card create/get round-trip', async () => {
    await s.createShareCard({
      id: 'abcd1234', kind: 'solo', payloadJson: '{"kind":"solo"}',
      payloadHash: 'hash-a', createdAt: 10, expiresAt: 1000,
    });
    const got = await s.getShareCard('abcd1234');
    expect(got?.kind).toBe('solo');
    expect(got?.payloadJson).toBe('{"kind":"solo"}');
    expect(got?.roomId).toBeUndefined();
    expect(await s.getShareCard('nope0000')).toBeUndefined();
  });

  it('share card — stores/restores roomId', async () => {
    await s.createShareCard({
      id: 'room5678', kind: 'compat', payloadJson: '{"kind":"compat"}',
      payloadHash: 'hash-r', roomId: uid('room1'), createdAt: 10, expiresAt: 1000,
    });
    expect((await s.getShareCard('room5678'))?.roomId).toBe(uid('room1'));
  });

  it('share card — creating a duplicate id throws', async () => {
    const card = {
      id: 'dupdupdu', kind: 'solo' as const, payloadJson: '{}',
      payloadHash: 'h1', createdAt: 1, expiresAt: 1000,
    };
    await s.createShareCard(card);
    await expect(s.createShareCard({ ...card, payloadHash: 'h2' })).rejects.toThrow();
  });

  it('findShareCardByHash — returns only non-expired cards', async () => {
    await s.createShareCard({
      id: 'live0001', kind: 'solo', payloadJson: '{"a":1}',
      payloadHash: 'hash-live', createdAt: 10, expiresAt: 1000,
    });
    expect((await s.findShareCardByHash('hash-live', 999))?.id).toBe('live0001');
    expect(await s.findShareCardByHash('hash-live', 1000)).toBeUndefined(); // expiry boundary
    expect(await s.findShareCardByHash('hash-none', 999)).toBeUndefined();
  });

  it('deleteExpiredShareCards — deletes only expired cards, returns the count', async () => {
    await s.createShareCard({ id: 'old00001', kind: 'solo', payloadJson: '{}', payloadHash: 'h-old', createdAt: 1, expiresAt: 100 });
    await s.createShareCard({ id: 'new00001', kind: 'solo', payloadJson: '{}', payloadHash: 'h-new', createdAt: 1, expiresAt: 5000 });
    expect(await s.deleteExpiredShareCards(100)).toBe(1);
    expect(await s.getShareCard('old00001')).toBeUndefined();
    expect((await s.getShareCard('new00001'))?.id).toBe('new00001');
  });
}
