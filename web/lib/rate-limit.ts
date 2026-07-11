import 'server-only';
import { createHash, createHmac } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabase-admin';

// Fixed-window rate limiter with two interchangeable backends:
//   - Supabase (increment_rate_limit RPC from 0002_rate_limits.sql) when configured
//   - an in-memory Map fallback for local dev with no Supabase
// FAIL-OPEN: any backend error allows the request through (availability first) but logs a greppable
// marker so it can't fail silently forever. See checkRateLimit.

/** Friendly, in-voice 429 body. Warm/playful best-friend tone (teens–30s US/EU audience). */
export const RATE_LIMIT_MESSAGE = 'Whoa, the acorns need a breather — try again in a bit. 🐿️';

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the current window resets. Only set when allowed === false. */
  retryAfterSec?: number;
}

// ── Tunable limits ────────────────────────────────────────────────────────────────────────────
// One block, one place for the owner to tune. Each entry is { scope, limit, windowSec }: the limiter
// allows up to `limit` hits per `windowSec` window, per rate-limit key (userId when authenticated,
// else a hashed IP). `scope` namespaces the counter so different features never share a bucket.
//
// Defaults follow the team lead's spec. Rationale per line below; bump these if real traffic proves
// them too tight. Windows are wall-clock fixed windows (not sliding), so a burst can straddle a
// boundary — that's an accepted trade-off for a cheap, atomic counter.
export type RateLimitKind =
  | 'teaser'
  | 'oracle'
  | 'paidReading'
  | 'checkout'
  | 'referral'
  | 'compatRoomCreate'
  | 'compatRoomJoin';

export const RATE_LIMITS: Record<RateLimitKind, { scope: string; limit: number; windowSec: number }> = {
  // Free teaser burns real LLM money and needs no login — tightest limit, keyed by hashed IP. 5/hour.
  teaser: { scope: 'teaser', limit: 5, windowSec: 60 * 60 },
  // Oracle draws (first 2 free, then charged). 30/day is generous for a normal user, blocks scripts.
  oracle: { scope: 'oracle', limit: 30, windowSec: 24 * 60 * 60 },
  // Paid reading already costs the user a credit (self-limiting). Loose cap only to stop a
  // compromised-account script loop from draining a balance + hammering the LLM. 20/hour.
  paidReading: { scope: 'paid_reading', limit: 20, windowSec: 60 * 60 },
  // Checkout order creation — abuse here spams the payment provider / pending-order table. 10/hour.
  checkout: { scope: 'checkout', limit: 10, windowSec: 60 * 60 },
  // Referral apply — low-cost but a user-triggered write surface. 10/hour.
  referral: { scope: 'referral', limit: 10, windowSec: 60 * 60 },
  // Compat room create — each room is a stored artifact; a host rarely needs many. 5/hour.
  compatRoomCreate: { scope: 'compat_room_create', limit: 5, windowSec: 60 * 60 },
  // Compat room join — unauthenticated guest flow (keyed by hashed IP). Higher than create because
  // several friends legitimately join one room in a short burst. 20/hour.
  compatRoomJoin: { scope: 'compat_room_join', limit: 20, windowSec: 60 * 60 },
};

// ── Key resolution ──────────────────────────────────────────────────────────────────────────────

/** Rate-limit key for an authenticated caller. */
export function userKey(userId: string): string {
  return `u:${userId}`;
}

/**
 * Rate-limit key for an anonymous caller, from the x-forwarded-for header. Never stores the raw IP:
 * hashes it (HMAC-SHA256 peppered with PII_HASH_KEY when present, plain SHA-256 otherwise — dev has
 * no key and uses the in-memory backend that never persists). Takes the first hop of x-forwarded-for.
 */
export function ipKey(forwardedFor: string | null | undefined): string {
  const first = (forwardedFor ?? '').split(',')[0]?.trim() || 'unknown';
  const pepper = process.env['PII_HASH_KEY'];
  const hash = pepper
    ? createHmac('sha256', pepper).update(first).digest('hex')
    : createHash('sha256').update(first).digest('hex');
  return `ip:${hash}`;
}

// ── Core fixed-window algorithm ─────────────────────────────────────────────────────────────────

/** Start (ms) of the fixed window that `now` falls into, for a `windowSec`-second window. */
export function windowStartFor(now: number, windowSec: number): number {
  const windowMs = windowSec * 1000;
  return Math.floor(now / windowMs) * windowMs;
}

function decide(count: number, limit: number, windowStartMs: number, windowSec: number, now: number): RateLimitResult {
  if (count <= limit) return { allowed: true };
  const resetMs = windowStartMs + windowSec * 1000;
  return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((resetMs - now) / 1000)) };
}

type MemEntry = { windowStart: number; count: number };
export type MemStore = Map<string, MemEntry>;

/** In-memory backend. Exported for tests (pass your own store + fixed `now`). */
export function checkMemory(
  store: MemStore, scope: string, key: string, limit: number, windowSec: number, now: number = Date.now(),
): RateLimitResult {
  const windowStart = windowStartFor(now, windowSec);
  const ck = `${scope}:${key}`;
  const cur = store.get(ck);
  const count = cur && cur.windowStart === windowStart ? cur.count + 1 : 1;
  store.set(ck, { windowStart, count });
  return decide(count, limit, windowStart, windowSec, now);
}

/** Supabase backend. Exported for tests. Throws on backend error — the caller decides fail-open. */
export async function checkSupabase(
  sb: SupabaseClient, scope: string, key: string, limit: number, windowSec: number, now: number = Date.now(),
): Promise<RateLimitResult> {
  const windowStart = windowStartFor(now, windowSec);
  const ck = `${scope}:${key}`;
  const { data, error } = await sb.rpc('increment_rate_limit', {
    p_key: ck,
    p_window_start: new Date(windowStart).toISOString(),
  });
  if (error) throw new Error(error.message);
  return decide(Number(data), limit, windowStart, windowSec, now);
}

// ── Public entry points ─────────────────────────────────────────────────────────────────────────

// Mirrors the both-or-neither detection in lib/services.ts (useSupabase). The strict half-configured
// guard already runs there at startup; here a half-configured state just falls back to in-memory, and
// any real backend failure is caught below and failed open.
function useSupabaseBackend(): boolean {
  return Boolean(process.env['NEXT_PUBLIC_SUPABASE_URL'] && process.env['SUPABASE_SERVICE_ROLE_KEY']);
}

// Per-route server bundles may not share module scope, so cache the in-memory map on globalThis
// (same reason as lib/services.ts). The Supabase path keeps its state in the DB.
const g = globalThis as typeof globalThis & { __dotoriRateLimits?: MemStore };
function memStore(): MemStore {
  return (g.__dotoriRateLimits ??= new Map());
}

/**
 * Check (and consume) one hit against the fixed-window limiter. FAIL-OPEN: if the Supabase backend
 * throws, the request is allowed through and the failure is logged with [RATE_LIMIT_BACKEND_ERROR].
 */
export async function checkRateLimit(
  scope: string, key: string, limit: number, windowSec: number,
): Promise<RateLimitResult> {
  if (useSupabaseBackend()) {
    try {
      return await checkSupabase(supabaseAdmin(), scope, key, limit, windowSec);
    } catch (error) {
      console.error('[RATE_LIMIT_BACKEND_ERROR]', {
        scope,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return { allowed: true };
    }
  }
  return checkMemory(memStore(), scope, key, limit, windowSec);
}

/** Convenience wrapper: look up the tunable config for `kind` and enforce it against `key`. */
export function enforceRateLimit(kind: RateLimitKind, key: string): Promise<RateLimitResult> {
  const c = RATE_LIMITS[kind];
  return checkRateLimit(c.scope, key, c.limit, c.windowSec);
}
