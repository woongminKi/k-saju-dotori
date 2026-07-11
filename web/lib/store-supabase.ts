import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DuplicatePendingOrderError,
  type Store, type User, type LedgerEntry, type Order, type ReadingRecord, type OrderStatus, type LedgerReason,
  type PointsEntry, type PointsReason, type CompatRoom, type CompatRoomEntry, type ShareCard,
} from './store';

const ms = (iso: string): number => new Date(iso).getTime();
const iso = (n: number): string => new Date(n).toISOString();

export class SupabaseStore implements Store {
  constructor(private sb: SupabaseClient) {}

  private toUser(r: Record<string, any>): User {
    return {
      id: r['id'],
      providerId: r['provider_id'] ?? undefined,
      createdAt: ms(r['created_at']),
      referralCode: r['referral_code'],
      referredBy: r['referred_by'] ?? undefined,
    };
  }

  async getUser(id: string): Promise<User | undefined> {
    const { data } = await this.sb.from('users').select('*').eq('id', id).maybeSingle();
    return data ? this.toUser(data) : undefined;
  }
  async upsertUser(user: User): Promise<void> {
    const { error } = await this.sb.from('users').upsert({
      id: user.id,
      provider_id: user.providerId ?? null,
      created_at: iso(user.createdAt),
      referral_code: user.referralCode,
      referred_by: user.referredBy ?? null,
    });
    if (error) throw new Error(`upsertUser failed: ${error.message}`);
  }

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    const { data } = await this.sb.from('users').select('*').eq('referral_code', code).maybeSingle();
    return data ? this.toUser(data) : undefined;
  }
  async setReferredBy(userId: string, referrerId: string): Promise<boolean> {
    const existing = await this.getUser(userId);
    if (!existing) throw new Error(`user not found: ${userId}`);
    const { data, error } = await this.sb.from('users')
      .update({ referred_by: referrerId }).eq('id', userId).is('referred_by', null).select('id');
    if (error) throw new Error(`setReferredBy failed: ${error.message}`);
    return (data?.length ?? 0) > 0;
  }

  async appendPoints(e: PointsEntry): Promise<void> {
    const { error } = await this.sb.from('points_ledger').insert({
      user_id: e.userId, delta: e.delta, reason: e.reason, ref: e.ref ?? null, at: iso(e.at),
    });
    if (error) throw new Error(`appendPoints failed: ${error.message}`);
  }
  async pointsFor(userId: string): Promise<PointsEntry[]> {
    const { data, error } = await this.sb.from('points_ledger').select('*').eq('user_id', userId).order('id');
    if (error) throw new Error(`pointsFor failed: ${error.message}`);
    return (data ?? []).map((r) => ({
      userId: r.user_id, delta: r.delta, reason: r.reason as PointsReason, ref: r.ref ?? undefined, at: ms(r.at),
    }));
  }

  async appendLedger(e: LedgerEntry): Promise<void> {
    const { error } = await this.sb.from('ledger').insert({
      user_id: e.userId, delta: e.delta, reason: e.reason, ref: e.ref ?? null, at: iso(e.at),
    });
    if (error) throw new Error(`appendLedger failed: ${error.message}`);
  }
  async ledgerFor(userId: string): Promise<LedgerEntry[]> {
    const { data, error } = await this.sb.from('ledger').select('*').eq('user_id', userId).order('id');
    if (error) throw new Error(`ledgerFor failed: ${error.message}`);
    return (data ?? []).map((r) => ({
      userId: r.user_id, delta: r.delta, reason: r.reason as LedgerReason, ref: r.ref ?? undefined, at: ms(r.at),
    }));
  }

  async createOrder(o: Order): Promise<void> {
    const { error } = await this.sb.from('orders').insert({
      id: o.id, user_id: o.userId, units: o.units, amount_cents: o.amountCents, currency: o.currency,
      status: o.status, pg_token: o.pgToken ?? null, points_applied: o.pointsApplied ?? 0,
      product: o.product ?? 'reading', created_at: iso(o.createdAt),
    });
    if (error) {
      // Only occurs on a DB with the partial unique index applied — without it, a 23505 can't be
      // raised on this constraint, so the existing behavior (throw below) holds.
      if (error.code === '23505' && error.message?.includes('orders_pending_dedup_idx')) {
        const existing = await this.findPendingDuplicate(
          o.userId, o.product ?? 'reading', o.units, o.pointsApplied ?? 0,
        );
        if (existing) throw new DuplicatePendingOrderError(existing);
      }
      throw new Error(`createOrder failed: ${error.message}`);
    }
  }
  private async findPendingDuplicate(
    userId: string, product: string, units: number, pointsApplied: number,
  ): Promise<Order | undefined> {
    const { data } = await this.sb.from('orders').select('*')
      .eq('user_id', userId).eq('status', 'pending').eq('product', product)
      .eq('units', units).eq('points_applied', pointsApplied).limit(1).maybeSingle();
    return data ? this.toOrder(data) : undefined;
  }
  async getOrder(id: string): Promise<Order | undefined> {
    const { data } = await this.sb.from('orders').select('*').eq('id', id).maybeSingle();
    return data ? this.toOrder(data) : undefined;
  }
  async getOrderByToken(pgToken: string): Promise<Order | undefined> {
    const { data } = await this.sb.from('orders').select('*').eq('pg_token', pgToken).maybeSingle();
    return data ? this.toOrder(data) : undefined;
  }
  async updateOrder(id: string, patch: Partial<Order>): Promise<void> {
    const row: Record<string, unknown> = {};
    if (patch.status !== undefined) row['status'] = patch.status;
    if (patch.pgToken !== undefined) row['pg_token'] = patch.pgToken;
    if (patch.units !== undefined) row['units'] = patch.units;
    if (patch.amountCents !== undefined) row['amount_cents'] = patch.amountCents;
    if (patch.currency !== undefined) row['currency'] = patch.currency;
    const { data, error } = await this.sb.from('orders').update(row).eq('id', id).select('id');
    if (error) throw new Error(`updateOrder failed: ${error.message}`);
    if (!data || data.length === 0) throw new Error(`order not found: ${id}`);
  }
  async markOrderPaid(id: string): Promise<boolean> {
    const existing = await this.getOrder(id);
    if (!existing) throw new Error(`order not found: ${id}`);
    const { data, error } = await this.sb.from('orders')
      .update({ status: 'paid' }).eq('id', id).eq('status', 'pending').select('id');
    if (error) throw new Error(`markOrderPaid failed: ${error.message}`);
    return (data?.length ?? 0) > 0;
  }
  async markOrderRefunded(id: string): Promise<boolean> {
    const existing = await this.getOrder(id);
    if (!existing) throw new Error(`order not found: ${id}`);
    const { data, error } = await this.sb.from('orders')
      .update({ status: 'refunded' }).eq('id', id).eq('status', 'paid').select('id');
    if (error) throw new Error(`markOrderRefunded failed: ${error.message}`);
    return (data?.length ?? 0) > 0;
  }
  async markOrderCanceled(id: string): Promise<boolean> {
    const existing = await this.getOrder(id);
    if (!existing) throw new Error(`order not found: ${id}`);
    const { data, error } = await this.sb.from('orders')
      .update({ status: 'canceled' }).eq('id', id).eq('status', 'pending').select('id');
    if (error) throw new Error(`markOrderCanceled failed: ${error.message}`);
    return (data?.length ?? 0) > 0;
  }
  async markOrderFailed(id: string): Promise<boolean> {
    const existing = await this.getOrder(id);
    if (!existing) throw new Error(`order not found: ${id}`);
    const { data, error } = await this.sb.from('orders')
      .update({ status: 'failed' }).eq('id', id).eq('status', 'pending').select('id');
    if (error) throw new Error(`markOrderFailed failed: ${error.message}`);
    return (data?.length ?? 0) > 0;
  }
  async pendingOrdersOlderThan(cutoff: number, limit = 200): Promise<Order[]> {
    const { data, error } = await this.sb.from('orders').select('*')
      .eq('status', 'pending').not('pg_token', 'is', null).lte('created_at', iso(cutoff))
      .order('created_at', { ascending: true }).limit(limit);
    if (error) throw new Error(`pendingOrdersOlderThan failed: ${error.message}`);
    return (data ?? []).map((r) => this.toOrder(r));
  }
  async pendingOrdersForUserSince(userId: string, sinceMs: number): Promise<Order[]> {
    const { data, error } = await this.sb.from('orders').select('*')
      .eq('user_id', userId).eq('status', 'pending').gte('created_at', iso(sinceMs));
    if (error) throw new Error(`pendingOrdersForUserSince failed: ${error.message}`);
    return (data ?? []).map((r) => this.toOrder(r));
  }
  private toOrder(r: Record<string, any>): Order {
    return {
      id: r['id'], userId: r['user_id'], units: r['units'], amountCents: r['amount_cents'],
      currency: r['currency'] ?? 'usd',
      status: r['status'] as OrderStatus, pgToken: r['pg_token'] ?? undefined,
      pointsApplied: r['points_applied'] ?? undefined,
      product: (r['product'] as 'reading' | 'oracle') ?? 'reading', createdAt: ms(r['created_at']),
    };
  }

  async saveReading(r: ReadingRecord): Promise<void> {
    const { error } = await this.sb.from('readings').insert({
      id: r.id, user_id: r.userId, menu: r.menu, birth_hash: r.birthHash,
      encrypted_inputs: r.encryptedInputs, result_json: r.resultJson,
      created_at: iso(r.createdAt), expires_at: iso(r.expiresAt),
    });
    if (error) throw new Error(`saveReading failed: ${error.message}`);
  }
  async findReading(userId: string, menu: string, birthHash: string): Promise<ReadingRecord | undefined> {
    const { data } = await this.sb.from('readings').select('*')
      .eq('user_id', userId).eq('menu', menu).eq('birth_hash', birthHash).maybeSingle();
    return data ? this.toReading(data) : undefined;
  }
  async readingsFor(userId: string): Promise<ReadingRecord[]> {
    const { data, error } = await this.sb.from('readings').select('*').eq('user_id', userId);
    if (error) throw new Error(`readingsFor failed: ${error.message}`);
    return (data ?? []).map((r) => this.toReading(r));
  }
  async deleteReading(id: string): Promise<void> {
    const { error } = await this.sb.from('readings').delete().eq('id', id);
    if (error) throw new Error(`deleteReading failed: ${error.message}`);
  }
  async allReadings(): Promise<ReadingRecord[]> {
    const { data, error } = await this.sb.from('readings').select('*');
    if (error) throw new Error(`allReadings failed: ${error.message}`);
    return (data ?? []).map((r) => this.toReading(r));
  }
  async getReadingById(id: string): Promise<ReadingRecord | undefined> {
    const { data } = await this.sb.from('readings').select('*').eq('id', id).maybeSingle();
    return data ? this.toReading(data) : undefined;
  }
  private toReading(r: Record<string, any>): ReadingRecord {
    return {
      id: r['id'], userId: r['user_id'], menu: r['menu'], birthHash: r['birth_hash'],
      encryptedInputs: r['encrypted_inputs'], resultJson: r['result_json'],
      createdAt: ms(r['created_at']), expiresAt: ms(r['expires_at']),
    };
  }

  async incrementMenuCount(menu: string): Promise<void> {
    const { error } = await this.sb.rpc('increment_menu_count', { p_menu: menu });
    if (error) throw new Error(`incrementMenuCount failed: ${error.message}`);
  }
  async menuCounts(): Promise<Record<string, number>> {
    const { data, error } = await this.sb.from('menu_counts').select('*');
    if (error) throw new Error(`menuCounts failed: ${error.message}`);
    return Object.fromEntries((data ?? []).map((r) => [r.menu, Number(r.count)]));
  }

  async createRoom(room: CompatRoom): Promise<void> {
    const { error } = await this.sb.from('compat_rooms').insert({
      id: room.id, host_user_id: room.hostUserId, host_name: room.hostName ?? null,
      host_birth_encrypted: room.hostBirthEncrypted,
      created_at: iso(room.createdAt), expires_at: iso(room.expiresAt),
    });
    if (error) throw new Error(`createRoom failed: ${error.message}`);
  }
  async getRoom(id: string, now = Date.now()): Promise<CompatRoom | undefined> {
    const { data } = await this.sb.from('compat_rooms').select('*').eq('id', id).maybeSingle();
    if (!data) return undefined;
    const room = this.toRoom(data);
    return room.expiresAt <= now ? undefined : room;
  }
  async addRoomEntry(entry: CompatRoomEntry): Promise<void> {
    const { error } = await this.sb.from('compat_room_entries').upsert({
      id: entry.id, room_id: entry.roomId, nickname: entry.nickname,
      guest_birth_encrypted: entry.guestBirthEncrypted, score: entry.score, created_at: iso(entry.createdAt),
    }, { onConflict: 'room_id,nickname' });
    if (error) throw new Error(`addRoomEntry failed: ${error.message}`);
  }
  async roomEntries(roomId: string): Promise<CompatRoomEntry[]> {
    const { data, error } = await this.sb.from('compat_room_entries').select('*')
      .eq('room_id', roomId).order('score', { ascending: false }).order('created_at', { ascending: true });
    if (error) throw new Error(`roomEntries failed: ${error.message}`);
    return (data ?? []).map((r) => this.toRoomEntry(r));
  }
  async allRooms(): Promise<CompatRoom[]> {
    const { data, error } = await this.sb.from('compat_rooms').select('*');
    if (error) throw new Error(`allRooms failed: ${error.message}`);
    return (data ?? []).map((r) => this.toRoom(r));
  }
  async deleteRoom(id: string): Promise<void> {
    const { error: e1 } = await this.sb.from('compat_room_entries').delete().eq('room_id', id);
    if (e1) throw new Error(`deleteRoom(entries) failed: ${e1.message}`);
    const { error: e2 } = await this.sb.from('compat_rooms').delete().eq('id', id);
    if (e2) throw new Error(`deleteRoom failed: ${e2.message}`);
  }
  async roomsForHost(hostUserId: string): Promise<CompatRoom[]> {
    const { data, error } = await this.sb.from('compat_rooms').select('*')
      .eq('host_user_id', hostUserId).order('created_at', { ascending: false });
    if (error) throw new Error(`roomsForHost failed: ${error.message}`);
    return (data ?? []).map((r) => this.toRoom(r));
  }
  async setRoomExpiry(id: string, expiresAt: number): Promise<void> {
    const { data, error } = await this.sb.from('compat_rooms')
      .update({ expires_at: iso(expiresAt) }).eq('id', id).select('id');
    if (error) throw new Error(`setRoomExpiry failed: ${error.message}`);
    if (!data || data.length === 0) throw new Error(`room not found: ${id}`);
  }
  private toRoom(r: Record<string, any>): CompatRoom {
    return {
      id: r['id'], hostUserId: r['host_user_id'], hostName: r['host_name'] ?? undefined,
      hostBirthEncrypted: r['host_birth_encrypted'],
      createdAt: ms(r['created_at']), expiresAt: ms(r['expires_at']),
    };
  }
  private toRoomEntry(r: Record<string, any>): CompatRoomEntry {
    return {
      id: r['id'], roomId: r['room_id'], nickname: r['nickname'],
      guestBirthEncrypted: r['guest_birth_encrypted'], score: r['score'], createdAt: ms(r['created_at']),
    };
  }

  async createShareCard(card: ShareCard): Promise<void> {
    const { error } = await this.sb.from('share_cards').insert({
      id: card.id, kind: card.kind, payload: JSON.parse(card.payloadJson),
      payload_hash: card.payloadHash, room_id: card.roomId ?? null,
      created_at: iso(card.createdAt), expires_at: iso(card.expiresAt),
    });
    if (error) throw new Error(`createShareCard failed: ${error.message}`);
  }
  async getShareCard(id: string): Promise<ShareCard | undefined> {
    const { data, error } = await this.sb.from('share_cards').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(`getShareCard failed: ${error.message}`);
    return data ? this.toShareCard(data) : undefined;
  }
  async findShareCardByHash(hash: string, now = Date.now()): Promise<ShareCard | undefined> {
    const { data, error } = await this.sb.from('share_cards').select('*')
      .eq('payload_hash', hash).gt('expires_at', iso(now)).limit(1);
    if (error) throw new Error(`findShareCardByHash failed: ${error.message}`);
    const row = data?.[0];
    return row ? this.toShareCard(row) : undefined;
  }
  async deleteExpiredShareCards(now: number): Promise<number> {
    const { data, error } = await this.sb.from('share_cards')
      .delete().lte('expires_at', iso(now)).select('id');
    if (error) throw new Error(`deleteExpiredShareCards failed: ${error.message}`);
    return data?.length ?? 0;
  }
  private toShareCard(r: Record<string, any>): ShareCard {
    return {
      id: r['id'], kind: r['kind'] as 'solo' | 'compat',
      payloadJson: JSON.stringify(r['payload']), payloadHash: r['payload_hash'],
      roomId: r['room_id'] ?? undefined,
      createdAt: ms(r['created_at']), expiresAt: ms(r['expires_at']),
    };
  }
}
