import { describe, it, expect, vi } from 'vitest';

// Unique user id so this route test gets its own clean rate-limit bucket (the in-memory limiter is
// process-global). Referral limit is 10/hour (RATE_LIMITS.referral), so the 11th call must 429.
const USER_ID = `route-test-${Math.random().toString(36).slice(2)}`;

vi.mock('../../../lib/services', () => ({
  getAuth: () => ({ getCurrentUser: async () => ({ id: USER_ID }) }),
  getStore: () => ({}),
}));
// Keep the code path short: every allowed call resolves to a plain invalid-code 400. We only care
// that the rate limiter — not referral logic — produces the 429.
vi.mock('../../../lib/referral', () => ({
  claimReferral: async () => ({ ok: false, reason: 'invalid_code' }),
}));
vi.mock('../../../lib/ref-cookie', () => ({ clearRefCookie: async () => {} }));

import { POST } from './route';

function post(code: string): Promise<Response> {
  return POST(new Request('http://localhost/api/referral', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code }),
  }));
}

describe('POST /api/referral rate limiting', () => {
  it('returns 429 with a Retry-After header once the per-user limit is exceeded', async () => {
    const CODE = 'DOTORI-XXXX'; // valid format, nonexistent -> claimReferral 400 while allowed

    // First 10 are allowed through (and 400 on the referral logic, not 429).
    for (let i = 0; i < 10; i++) {
      const res = await post(CODE);
      expect(res.status).not.toBe(429);
    }

    // 11th exceeds the window and is rate limited.
    const limited = await post(CODE);
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBeTruthy();
    const body = await limited.json();
    expect(body.error).toMatch(/acorns/i);
  });
});
