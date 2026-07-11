import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { InMemoryStore } from '../store';
import { resolveReading, resolveReadingStreaming } from '../reading-flow';
import { balance } from '../wallet';
import type { MenuResult, MenuId } from '@engine/menus/types';
import type { StartedMenu } from '@engine/menus/solo';

beforeAll(() => {
  process.env.PII_ENC_KEY = '0'.repeat(64);
  process.env.PII_HASH_KEY = 'test-hash-key';
});

afterEach(() => {
  delete process.env['DEV_UNLOCK_BYPASS'];
});

function okResult(menu: MenuId = 'career', body = 'A grounded, structured read.'): MenuResult {
  return {
    menu, sections: [{ id: menu, title: 't', body, ok: true }],
    teaser: body.slice(0, 20), locked: false, promptVersion: 'v', partial: false,
  };
}

function emptyResult(menu: MenuId = 'career'): MenuResult {
  return {
    menu, sections: [{ id: menu, title: 't', body: '', ok: false }],
    teaser: '', locked: true, promptVersion: 'v', partial: true,
  };
}

describe('resolveReading — cache -> balance -> generate -> charge/refund', () => {
  it('insufficient balance -> "insufficient", computeUnlocked never called (no LLM spend)', async () => {
    const store = new InMemoryStore();
    const computeUnlocked = vi.fn(async () => okResult());
    const outcome = await resolveReading({
      store, userId: 'u1', menu: 'career', normalizedInput: 'x', computeUnlocked,
    });
    expect(outcome.kind).toBe('insufficient');
    expect(computeUnlocked).not.toHaveBeenCalled();
  });

  it('with balance -> generates, charges exactly 1 unit, and saves the reading', async () => {
    const store = new InMemoryStore();
    await store.appendLedger({ userId: 'u1', delta: 1, reason: 'topup', at: 0 });
    const computeUnlocked = vi.fn(async () => okResult());

    const outcome = await resolveReading({
      store, userId: 'u1', menu: 'career', normalizedInput: 'x', computeUnlocked,
    });

    expect(outcome.kind).toBe('generated');
    expect(computeUnlocked).toHaveBeenCalledTimes(1);
    expect(await balance(store, 'u1')).toBe(0);
    expect(await store.readingsFor('u1')).toHaveLength(1);
  });

  it('a second call with the same normalized input reuses the cached reading — no charge, no LLM', async () => {
    const store = new InMemoryStore();
    await store.appendLedger({ userId: 'u1', delta: 2, reason: 'topup', at: 0 });
    const computeUnlocked = vi.fn(async () => okResult());

    await resolveReading({ store, userId: 'u1', menu: 'career', normalizedInput: 'x', computeUnlocked });
    const second = await resolveReading({ store, userId: 'u1', menu: 'career', normalizedInput: 'x', computeUnlocked });

    expect(second.kind).toBe('reused');
    expect(computeUnlocked).toHaveBeenCalledTimes(1); // not called again
    expect(await balance(store, 'u1')).toBe(1); // only charged once
  });

  it('an expired cached reading is not reused — regenerates and charges again', async () => {
    const store = new InMemoryStore();
    await store.appendLedger({ userId: 'u1', delta: 2, reason: 'topup', at: 0 });
    const computeUnlocked = vi.fn(async () => okResult());

    const day = 24 * 60 * 60 * 1000;
    await resolveReading({ store, userId: 'u1', menu: 'career', normalizedInput: 'x', computeUnlocked, now: 0 });
    const second = await resolveReading({
      store, userId: 'u1', menu: 'career', normalizedInput: 'x', computeUnlocked, now: 31 * day,
    });

    expect(second.kind).toBe('generated');
    expect(computeUnlocked).toHaveBeenCalledTimes(2);
    expect(await balance(store, 'u1')).toBe(0);
  });

  it('total generation failure (no ok section with a body) -> "failed", no charge', async () => {
    const store = new InMemoryStore();
    await store.appendLedger({ userId: 'u1', delta: 1, reason: 'topup', at: 0 });
    const computeUnlocked = vi.fn(async () => emptyResult());

    const outcome = await resolveReading({
      store, userId: 'u1', menu: 'career', normalizedInput: 'x', computeUnlocked,
    });

    expect(outcome.kind).toBe('failed');
    expect(await balance(store, 'u1')).toBe(1); // untouched
  });

  it('a save failure refunds the just-spent unit and rethrows', async () => {
    const store = new InMemoryStore();
    await store.appendLedger({ userId: 'u1', delta: 1, reason: 'topup', at: 0 });
    vi.spyOn(store, 'saveReading').mockRejectedValueOnce(new Error('db down'));
    const computeUnlocked = vi.fn(async () => okResult());

    await expect(
      resolveReading({ store, userId: 'u1', menu: 'career', normalizedInput: 'x', computeUnlocked }),
    ).rejects.toThrow('db down');
    expect(await balance(store, 'u1')).toBe(1); // spend + refund cancel out
  });

  it('DEV_UNLOCK_BYPASS=1 (non-production) skips the balance gate and does not charge', async () => {
    process.env['DEV_UNLOCK_BYPASS'] = '1';
    const store = new InMemoryStore(); // 0 balance
    const computeUnlocked = vi.fn(async () => okResult());

    const outcome = await resolveReading({
      store, userId: 'u1', menu: 'career', normalizedInput: 'x', computeUnlocked,
    });

    expect(outcome.kind).toBe('generated');
    expect(await balance(store, 'u1')).toBe(0); // no charge, no save under bypass
    expect(await store.readingsFor('u1')).toHaveLength(0);
  });
});

describe('resolveReadingStreaming — same invariants, charge deferred to finalize()', () => {
  function startedMenu(result: MenuResult): StartedMenu {
    return {
      sections: result.sections.map((s) => ({ id: s.id, title: s.title, section: Promise.resolve(s) })),
      result: Promise.resolve(result),
    };
  }

  it('insufficient balance -> "insufficient", startUnlocked never called', async () => {
    const store = new InMemoryStore();
    const startUnlocked = vi.fn(() => startedMenu(okResult('solo')));
    const outcome = await resolveReadingStreaming({
      store, userId: 'u1', menu: 'solo', normalizedInput: 'x', startUnlocked,
    });
    expect(outcome.kind).toBe('insufficient');
    expect(startUnlocked).not.toHaveBeenCalled();
  });

  it('with balance -> streams sections immediately, charges/saves only after finalize()', async () => {
    const store = new InMemoryStore();
    await store.appendLedger({ userId: 'u1', delta: 1, reason: 'topup', at: 0 });
    const startUnlocked = () => startedMenu(okResult('solo'));

    const outcome = await resolveReadingStreaming({
      store, userId: 'u1', menu: 'solo', normalizedInput: 'x', startUnlocked,
    });
    if (outcome.kind !== 'streaming') throw new Error('expected streaming');
    expect(outcome.sections).toHaveLength(1);
    expect(await balance(store, 'u1')).toBe(1); // not charged yet

    const finalized = await outcome.finalize();
    expect(finalized.kind).toBe('saved');
    expect(await balance(store, 'u1')).toBe(0);
    expect(await store.readingsFor('u1')).toHaveLength(1);
  });

  it('finalize() on a total failure reports "failed" without charging', async () => {
    const store = new InMemoryStore();
    await store.appendLedger({ userId: 'u1', delta: 1, reason: 'topup', at: 0 });
    const startUnlocked = () => startedMenu(emptyResult('solo'));

    const outcome = await resolveReadingStreaming({
      store, userId: 'u1', menu: 'solo', normalizedInput: 'x', startUnlocked,
    });
    if (outcome.kind !== 'streaming') throw new Error('expected streaming');
    const finalized = await outcome.finalize();

    expect(finalized.kind).toBe('failed');
    expect(await balance(store, 'u1')).toBe(1);
  });

  it('a cached reading is reused without ever starting generation', async () => {
    const store = new InMemoryStore();
    await store.appendLedger({ userId: 'u1', delta: 2, reason: 'topup', at: 0 });
    const startUnlocked = vi.fn(() => startedMenu(okResult('solo')));

    const first = await resolveReadingStreaming({ store, userId: 'u1', menu: 'solo', normalizedInput: 'x', startUnlocked });
    if (first.kind !== 'streaming') throw new Error('expected streaming');
    await first.finalize();

    const second = await resolveReadingStreaming({ store, userId: 'u1', menu: 'solo', normalizedInput: 'x', startUnlocked });
    expect(second.kind).toBe('reused');
    expect(startUnlocked).toHaveBeenCalledTimes(1);
  });

  it('DEV_UNLOCK_BYPASS finalize() reports "bypass" and never charges/saves, even with a full body', async () => {
    process.env['DEV_UNLOCK_BYPASS'] = '1';
    const store = new InMemoryStore(); // 0 balance
    const startUnlocked = () => startedMenu(okResult('solo'));

    const outcome = await resolveReadingStreaming({
      store, userId: 'u1', menu: 'solo', normalizedInput: 'x', startUnlocked,
    });
    if (outcome.kind !== 'streaming') throw new Error('expected streaming (bypass skips the balance gate)');
    const finalized = await outcome.finalize();

    expect(finalized.kind).toBe('bypass');
    expect(await balance(store, 'u1')).toBe(0);
    expect(await store.readingsFor('u1')).toHaveLength(0);
  });

  it('a save failure in finalize() refunds and rethrows', async () => {
    const store = new InMemoryStore();
    await store.appendLedger({ userId: 'u1', delta: 1, reason: 'topup', at: 0 });
    vi.spyOn(store, 'saveReading').mockRejectedValueOnce(new Error('db down'));
    const startUnlocked = () => startedMenu(okResult('solo'));

    const outcome = await resolveReadingStreaming({
      store, userId: 'u1', menu: 'solo', normalizedInput: 'x', startUnlocked,
    });
    if (outcome.kind !== 'streaming') throw new Error('expected streaming');

    await expect(outcome.finalize()).rejects.toThrow('db down');
    expect(await balance(store, 'u1')).toBe(1);
  });
});
