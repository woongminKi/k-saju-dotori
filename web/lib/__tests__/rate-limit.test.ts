import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the admin client so the fail-open test can make the Supabase backend throw on demand. Other
// tests drive checkMemory / checkSupabase directly and never touch this.
const rpcMock = vi.fn();
vi.mock('../supabase-admin', () => ({
  supabaseAdmin: () => ({ rpc: rpcMock }),
}));

import {
  checkMemory, checkSupabase, checkRateLimit, windowStartFor, userKey, ipKey,
  type MemStore, type RateLimitResult,
} from '../rate-limit';

const SCOPE = 'test';
const KEY = 'k1';
const LIMIT = 3;
const WINDOW = 60; // seconds
const T0 = 1_000_000_000_000; // fixed "now" inside one window

/**
 * Minimal fake of the increment_rate_limit RPC (0002_rate_limits.sql): one atomic counter per
 * (key, window_start), plus the opportunistic delete of this key's older windows. Lets us run the
 * exact same assertions against the Supabase backend as against the in-memory one.
 */
function fakeSupabase() {
  const rows = new Map<string, { key: string; windowStart: number; count: number }>();
  return {
    rpc: async (_fn: string, args: { p_key: string; p_window_start: string }) => {
      const ws = new Date(args.p_window_start).getTime();
      for (const [id, row] of rows) {
        if (row.key === args.p_key && row.windowStart < ws) rows.delete(id);
      }
      const id = `${args.p_key}|${ws}`;
      const row = rows.get(id) ?? { key: args.p_key, windowStart: ws, count: 0 };
      row.count += 1;
      rows.set(id, row);
      return { data: row.count, error: null };
    },
  } as unknown as Parameters<typeof checkSupabase>[0];
}

describe('windowStartFor', () => {
  it('floors now to the window boundary', () => {
    const base = Math.floor(T0 / (WINDOW * 1000)) * (WINDOW * 1000);
    expect(windowStartFor(base, WINDOW)).toBe(base);
    // Any instant within the same window floors to the same start.
    expect(windowStartFor(base + 1_000, WINDOW)).toBe(base);
    expect(windowStartFor(base + WINDOW * 1000 - 1, WINDOW)).toBe(base);
    // The next window starts one window later.
    expect(windowStartFor(base + WINDOW * 1000, WINDOW)).toBe(base + WINDOW * 1000);
  });
});

describe('key resolution', () => {
  it('userKey namespaces by user id', () => {
    expect(userKey('abc')).toBe('u:abc');
  });
  it('ipKey hashes and never contains the raw ip', () => {
    const k = ipKey('203.0.113.7, 70.1.2.3');
    expect(k.startsWith('ip:')).toBe(true);
    expect(k).not.toContain('203.0.113.7');
    // First hop only, stable for the same ip.
    expect(ipKey('203.0.113.7')).toBe(k);
  });
  it('ipKey falls back to a shared bucket when the header is missing', () => {
    expect(ipKey(null)).toBe(ipKey(undefined));
  });
});

// The two backends must behave identically for the core algorithm, so run one shared spec against
// both. `run` performs a single hit and returns the result; `now` is injectable for rollover tests.
type Backend = { name: string; run: (now: number) => Promise<RateLimitResult> };

function memoryBackend(): Backend {
  const store: MemStore = new Map();
  return { name: 'memory', run: (now) => Promise.resolve(checkMemory(store, SCOPE, KEY, LIMIT, WINDOW, now)) };
}
function supabaseBackend(): Backend {
  const sb = fakeSupabase();
  return { name: 'supabase', run: (now) => checkSupabase(sb, SCOPE, KEY, LIMIT, WINDOW, now) };
}

describe.each([memoryBackend, supabaseBackend])('fixed-window algorithm (%s)', (makeBackend) => {
  it('allows up to the limit, blocks past it, with a retryAfter', async () => {
    const b = makeBackend();
    for (let i = 0; i < LIMIT; i++) {
      expect((await b.run(T0)).allowed).toBe(true);
    }
    const blocked = await b.run(T0);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(blocked.retryAfterSec).toBeLessThanOrEqual(WINDOW);
  });

  it('window rollover — a key over-limit in window N is allowed again in window N+1', async () => {
    const b = makeBackend();
    for (let i = 0; i < LIMIT; i++) await b.run(T0);
    expect((await b.run(T0)).allowed).toBe(false); // exhausted in window N

    const nextWindow = T0 + WINDOW * 1000;
    expect((await b.run(nextWindow)).allowed).toBe(true); // fresh in window N+1
  });
});

describe('checkRateLimit — fail-open on backend error', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('allows the request through and logs a greppable marker when the backend throws', async () => {
    rpcMock.mockRejectedValue(new Error('network blip'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await checkRateLimit('checkout', 'u:someone', 10, 3600);

    expect(res.allowed).toBe(true);
    expect(errSpy).toHaveBeenCalledWith('[RATE_LIMIT_BACKEND_ERROR]', expect.objectContaining({
      scope: 'checkout',
      key: 'u:someone',
      error: 'network blip',
    }));
  });

  it('blocks normally when the backend returns an over-limit count', async () => {
    rpcMock.mockResolvedValue({ data: 11, error: null }); // count 11 > limit 10
    const res = await checkRateLimit('checkout', 'u:heavy', 10, 3600);
    expect(res.allowed).toBe(false);
    expect(res.retryAfterSec).toBeGreaterThan(0);
  });
});
