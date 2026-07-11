export interface User {
  id: string;
  providerId?: string;       // OAuth provider account id (Google `sub`)
  createdAt: number;
  referralCode: string;      // auto-issued unique code (e.g. DOTORI-8F3A)
  referredBy?: string;       // referrer userId. Set once, on first claim only
}

export type LedgerReason =
  | 'topup'
  | 'spend'
  | 'refund'
  // Reclaim of granted reading units on payment refund (negative). Distinct from 'spend' (-1 usage).
  | 'refund_reclaim'
  // Oracle-draw credits (separate balance from reading units). reason prefixed with oracle_.
  | 'oracle_topup'
  | 'oracle_spend'
  | 'oracle_refund'
  | 'oracle_refund_reclaim';

/** Reasons that sum into the reading-units balance. Oracle credits excluded. */
export const READING_LEDGER_REASONS: readonly LedgerReason[] = ['topup', 'spend', 'refund', 'refund_reclaim'];
/** Reasons that sum into the oracle-draw credit balance. */
export const ORACLE_LEDGER_REASONS: readonly LedgerReason[] = [
  'oracle_topup',
  'oracle_spend',
  'oracle_refund',
  'oracle_refund_reclaim',
];

export interface LedgerEntry {
  userId: string;
  /** topup: +N, spend: -1, refund: +1 */
  delta: number;
  reason: LedgerReason;
  ref?: string;
  at: number;
}

export type PointsReason = 'referral_referrer' | 'referral_referee' | 'spend_topup' | 'refund_restore';

export interface PointsEntry {
  userId: string;
  /** grant +100, payment usage negative */
  delta: number;
  reason: PointsReason;
  ref?: string;              // referral: the other userId, spend: orderId
  at: number;
}

export type OrderStatus = 'pending' | 'paid' | 'canceled' | 'failed' | 'refunded';

export interface Order {
  id: string;
  userId: string;
  units: number;
  /** Charged amount in the smallest currency unit (cents). */
  amountCents: number;
  /** ISO 4217 currency code, lowercase (e.g. 'usd'). */
  currency: string;
  status: OrderStatus;
  pgToken?: string;
  // Points (cents) applied to this order. undefined if none used.
  pointsApplied?: number;
  /** Charge target. Defaults to 'reading' (reading units). 'oracle' = oracle-draw credits. */
  product?: 'reading' | 'oracle';
  createdAt: number;
}

/**
 * Root double-charge guard — thrown by createOrder when the DB partial unique index
 * (migration: orders_pending_dedup_idx, user_id+product+units+points_applied where status='pending')
 * is violated. InMemoryStore reproduces the same constraint in memory so production behavior and
 * testability match (single process has no real race, but this mirrors the UX locally/in tests).
 * The caller (checkout route) must, on this error, join the existingOrder rather than creating a new one.
 */
export class DuplicatePendingOrderError extends Error {
  constructor(public readonly existingOrder: Order) {
    super('A pending order with the same purchase intent already exists.');
    this.name = 'DuplicatePendingOrderError';
  }
}

export interface ReadingRecord {
  id: string;
  userId: string;
  menu: string;
  birthHash: string;
  encryptedInputs: string;
  resultJson: string;
  createdAt: number;
  expiresAt: number;
}

export interface CompatRoom {
  id: string;
  hostUserId: string;
  /** Host display name. Shown to guests. Falls back to a generic label in the UI if absent. */
  hostName?: string;
  hostBirthEncrypted: string;
  createdAt: number;
  expiresAt: number;
}

export interface CompatRoomEntry {
  id: string;
  roomId: string;
  nickname: string;
  guestBirthEncrypted: string;
  score: number;
  createdAt: number;
}

export interface ShareCard {
  id: string;              // 8-char lowercase+digit short id (for URLs)
  kind: 'solo' | 'compat';
  payloadJson: string;     // render snapshot (JSON). No PII.
  payloadHash: string;     // sha256 hex for dedup
  roomId?: string;         // compat card CTA room reference (loose ref, no FK)
  createdAt: number;
  expiresAt: number;
}

export interface Store {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: User): Promise<void>;
  getUserByReferralCode(code: string): Promise<User | undefined>;
  /** Atomically transition referredBy from null->referrerId. Only the winning call returns true. Already-set returns false. */
  setReferredBy(userId: string, referrerId: string): Promise<boolean>;

  appendPoints(entry: PointsEntry): Promise<void>;
  pointsFor(userId: string): Promise<PointsEntry[]>;

  appendLedger(entry: LedgerEntry): Promise<void>;
  ledgerFor(userId: string): Promise<LedgerEntry[]>;

  createOrder(order: Order): Promise<void>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrderByToken(pgToken: string): Promise<Order | undefined>;
  updateOrder(id: string, patch: Partial<Order>): Promise<void>;
  /** pending -> paid atomic transition. Only the winning call returns true. Already-paid/not-pending returns false. Prevents concurrent-confirm double credit. */
  markOrderPaid(id: string): Promise<boolean>;
  /** paid -> refunded atomic transition. Only the winning call returns true. Already-refunded/not-paid returns false. */
  markOrderRefunded(id: string): Promise<boolean>;
  /** pending -> canceled atomic transition. Only the winning call returns true. Not-pending returns false (won't overwrite a competing transition). */
  markOrderCanceled(id: string): Promise<boolean>;
  /** pending -> failed atomic transition. Only the winning call returns true. Not-pending returns false (same reason as above). */
  markOrderFailed(id: string): Promise<boolean>;
  /**
   * For the reconciliation sweep — only status='pending' && has pgToken && createdAt<=cutoff orders,
   * ascending by createdAt, up to limit. Filtering in the store keeps the cron off a full table scan.
   */
  pendingOrdersOlderThan(cutoff: number, limit?: number): Promise<Order[]>;
  /** For the retry double-charge guard — the user's status='pending' && createdAt>=sinceMs orders (any product, last few). */
  pendingOrdersForUserSince(userId: string, sinceMs: number): Promise<Order[]>;

  saveReading(r: ReadingRecord): Promise<void>;
  findReading(userId: string, menu: string, birthHash: string): Promise<ReadingRecord | undefined>;
  readingsFor(userId: string): Promise<ReadingRecord[]>;
  deleteReading(id: string): Promise<void>;
  allReadings(): Promise<ReadingRecord[]>;
  getReadingById(id: string): Promise<ReadingRecord | undefined>;
  incrementMenuCount(menu: string): Promise<void>;
  menuCounts(): Promise<Record<string, number>>;
  createRoom(room: CompatRoom): Promise<void>;
  getRoom(id: string, now?: number): Promise<CompatRoom | undefined>;
  addRoomEntry(entry: CompatRoomEntry): Promise<void>;
  roomEntries(roomId: string): Promise<CompatRoomEntry[]>;
  allRooms(): Promise<CompatRoom[]>;
  deleteRoom(id: string): Promise<void>;
  /** All of a host's rooms — includes expired, createdAt desc. For the host management screen. */
  roomsForHost(hostUserId: string): Promise<CompatRoom[]>;
  /** Update expiry (extend/reopen). Throws for a missing room. */
  setRoomExpiry(id: string, expiresAt: number): Promise<void>;
  createShareCard(card: ShareCard): Promise<void>;
  getShareCard(id: string): Promise<ShareCard | undefined>;
  /** Non-expired card with the same payloadHash. expiresAt > now only, to avoid reusing an expired card. */
  findShareCardByHash(hash: string, now?: number): Promise<ShareCard | undefined>;
  deleteExpiredShareCards(now: number): Promise<number>;
}

export class InMemoryStore implements Store {
  private users = new Map<string, User>();
  private ledger: LedgerEntry[] = [];
  private points: PointsEntry[] = [];
  private orders = new Map<string, Order>();
  private readings = new Map<string, ReadingRecord>();
  private counts = new Map<string, number>();
  private rooms = new Map<string, CompatRoom>();
  private entries: CompatRoomEntry[] = [];
  private shareCards = new Map<string, ShareCard>();

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }
  async upsertUser(user: User): Promise<void> {
    this.users.set(user.id, user);
  }
  async getUserByReferralCode(code: string): Promise<User | undefined> {
    return [...this.users.values()].find((u) => u.referralCode === code);
  }
  async setReferredBy(userId: string, referrerId: string): Promise<boolean> {
    const cur = this.users.get(userId);
    if (!cur) throw new Error(`user not found: ${userId}`);
    if (cur.referredBy !== undefined) return false;
    this.users.set(userId, { ...cur, referredBy: referrerId });
    return true;
  }

  async appendLedger(entry: LedgerEntry): Promise<void> {
    this.ledger.push(entry);
  }
  async ledgerFor(userId: string): Promise<LedgerEntry[]> {
    return this.ledger.filter((e) => e.userId === userId);
  }
  async appendPoints(entry: PointsEntry): Promise<void> {
    this.points.push(entry);
  }
  async pointsFor(userId: string): Promise<PointsEntry[]> {
    return this.points.filter((e) => e.userId === userId);
  }

  async createOrder(order: Order): Promise<void> {
    // Reproduce the migration partial unique index (user_id+product+units+points_applied where
    // status='pending') in memory. A partial index only checks rows satisfying its WHERE clause,
    // so we only check for a conflict when the incoming order is itself pending (e.g. fixtures that
    // create a 'paid' order directly are not subject to it).
    if (order.status === 'pending') {
      const dup = [...this.orders.values()].find(
        (o) =>
          o.userId === order.userId &&
          o.status === 'pending' &&
          (o.product ?? 'reading') === (order.product ?? 'reading') &&
          o.units === order.units &&
          (o.pointsApplied ?? 0) === (order.pointsApplied ?? 0),
      );
      if (dup) throw new DuplicatePendingOrderError(dup);
    }
    this.orders.set(order.id, order);
  }
  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }
  async getOrderByToken(pgToken: string): Promise<Order | undefined> {
    return [...this.orders.values()].find((o) => o.pgToken === pgToken);
  }
  async updateOrder(id: string, patch: Partial<Order>): Promise<void> {
    const cur = this.orders.get(id);
    if (!cur) throw new Error(`order not found: ${id}`);
    this.orders.set(id, { ...cur, ...patch });
  }
  async markOrderPaid(id: string): Promise<boolean> {
    const cur = this.orders.get(id);
    if (!cur) throw new Error(`order not found: ${id}`);
    if (cur.status !== 'pending') return false;
    this.orders.set(id, { ...cur, status: 'paid' });
    return true;
  }
  async markOrderRefunded(id: string): Promise<boolean> {
    const cur = this.orders.get(id);
    if (!cur) throw new Error(`order not found: ${id}`);
    if (cur.status !== 'paid') return false;
    this.orders.set(id, { ...cur, status: 'refunded' });
    return true;
  }
  async markOrderCanceled(id: string): Promise<boolean> {
    const cur = this.orders.get(id);
    if (!cur) throw new Error(`order not found: ${id}`);
    if (cur.status !== 'pending') return false;
    this.orders.set(id, { ...cur, status: 'canceled' });
    return true;
  }
  async markOrderFailed(id: string): Promise<boolean> {
    const cur = this.orders.get(id);
    if (!cur) throw new Error(`order not found: ${id}`);
    if (cur.status !== 'pending') return false;
    this.orders.set(id, { ...cur, status: 'failed' });
    return true;
  }
  async pendingOrdersOlderThan(cutoff: number, limit = 200): Promise<Order[]> {
    return [...this.orders.values()]
      .filter((o) => o.status === 'pending' && o.pgToken && o.createdAt <= cutoff)
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, limit);
  }
  async pendingOrdersForUserSince(userId: string, sinceMs: number): Promise<Order[]> {
    return [...this.orders.values()].filter(
      (o) => o.userId === userId && o.status === 'pending' && o.createdAt >= sinceMs,
    );
  }

  async saveReading(r: ReadingRecord): Promise<void> {
    this.readings.set(r.id, r);
  }
  async findReading(userId: string, menu: string, birthHash: string): Promise<ReadingRecord | undefined> {
    return [...this.readings.values()].find(
      (r) => r.userId === userId && r.menu === menu && r.birthHash === birthHash,
    );
  }
  async readingsFor(userId: string): Promise<ReadingRecord[]> {
    return [...this.readings.values()].filter((r) => r.userId === userId);
  }
  async deleteReading(id: string): Promise<void> {
    this.readings.delete(id);
  }
  async allReadings(): Promise<ReadingRecord[]> {
    return [...this.readings.values()];
  }
  async getReadingById(id: string): Promise<ReadingRecord | undefined> {
    return this.readings.get(id);
  }
  async incrementMenuCount(menu: string): Promise<void> {
    this.counts.set(menu, (this.counts.get(menu) ?? 0) + 1);
  }
  async menuCounts(): Promise<Record<string, number>> {
    return Object.fromEntries(this.counts);
  }
  async createRoom(room: CompatRoom): Promise<void> {
    this.rooms.set(room.id, room);
  }
  async getRoom(id: string, now = Date.now()): Promise<CompatRoom | undefined> {
    const r = this.rooms.get(id);
    if (!r || r.expiresAt <= now) return undefined;
    return r;
  }
  async addRoomEntry(entry: CompatRoomEntry): Promise<void> {
    this.entries = this.entries.filter(
      (e) => !(e.roomId === entry.roomId && e.nickname === entry.nickname),
    );
    this.entries.push(entry);
  }
  async roomEntries(roomId: string): Promise<CompatRoomEntry[]> {
    return this.entries
      .filter((e) => e.roomId === roomId)
      .sort((a, b) => (b.score - a.score) || (a.createdAt - b.createdAt));
  }
  async allRooms(): Promise<CompatRoom[]> {
    return [...this.rooms.values()];
  }
  async deleteRoom(id: string): Promise<void> {
    this.rooms.delete(id);
    this.entries = this.entries.filter((e) => e.roomId !== id);
  }
  async roomsForHost(hostUserId: string): Promise<CompatRoom[]> {
    return [...this.rooms.values()]
      .filter((r) => r.hostUserId === hostUserId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }
  async setRoomExpiry(id: string, expiresAt: number): Promise<void> {
    const cur = this.rooms.get(id);
    if (!cur) throw new Error(`room not found: ${id}`);
    this.rooms.set(id, { ...cur, expiresAt });
  }

  async createShareCard(card: ShareCard): Promise<void> {
    if (this.shareCards.has(card.id)) throw new Error(`duplicate share card id: ${card.id}`);
    this.shareCards.set(card.id, card);
  }
  async getShareCard(id: string): Promise<ShareCard | undefined> {
    return this.shareCards.get(id);
  }
  async findShareCardByHash(hash: string, now = Date.now()): Promise<ShareCard | undefined> {
    return [...this.shareCards.values()].find((c) => c.payloadHash === hash && c.expiresAt > now);
  }
  async deleteExpiredShareCards(now: number): Promise<number> {
    let n = 0;
    for (const [id, c] of this.shareCards) {
      if (c.expiresAt <= now) {
        this.shareCards.delete(id);
        n++;
      }
    }
    return n;
  }
}
