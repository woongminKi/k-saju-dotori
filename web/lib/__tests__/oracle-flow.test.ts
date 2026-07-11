import { describe, it, expect, vi, beforeAll } from 'vitest';
import { InMemoryStore } from '../store';
import { resolveOracle, ORACLE_FREE_LIMIT } from '../oracle-flow';
import { oracleBalance, oracleTopUp } from '../oracle-wallet';
import type { OracleDraw } from '@engine/oracle';

beforeAll(() => {
  process.env.PII_ENC_KEY = '0'.repeat(64);
  process.env.PII_HASH_KEY = 'test-hash-key';
});

function draw(answer = 'Send it, keep it short.'): OracleDraw {
  return { question: 'Should I text them first?', answer, reason: 'Your Peer Star favors a steady approach.', promptVersion: 'v' };
}

describe('resolveOracle — free quota -> credit gate -> generate -> charge', () => {
  it(`the first ${ORACLE_FREE_LIMIT} distinct draws are free, decrementing freeLeft`, async () => {
    const store = new InMemoryStore();
    const drawFn = vi.fn(async () => draw());

    const first = await resolveOracle({
      store, userId: 'u1', questionId: 'crush-1', question: 'q1', normalizedInput: 'x', drawFn,
    });
    expect(first).toMatchObject({ kind: 'free', freeLeft: ORACLE_FREE_LIMIT - 1 });

    const second = await resolveOracle({
      store, userId: 'u1', questionId: 'crush-2', question: 'q2', normalizedInput: 'x', drawFn,
    });
    expect(second).toMatchObject({ kind: 'free', freeLeft: ORACLE_FREE_LIMIT - 2 });

    expect(await oracleBalance(store, 'u1')).toBe(0); // free draws never touch the credit ledger
  });

  it('after the free limit, a draw with no oracle credits reports "needCredit" without calling the LLM', async () => {
    const store = new InMemoryStore();
    const drawFn = vi.fn(async () => draw());
    for (let i = 0; i < ORACLE_FREE_LIMIT; i++) {
      await resolveOracle({ store, userId: 'u1', questionId: `q${i}`, question: `question ${i}`, normalizedInput: 'x', drawFn });
    }
    drawFn.mockClear();

    const outcome = await resolveOracle({
      store, userId: 'u1', questionId: 'qN', question: 'one more', normalizedInput: 'x', drawFn,
    });

    expect(outcome.kind).toBe('needCredit');
    expect(drawFn).not.toHaveBeenCalled();
  });

  it('after the free limit, with oracle credit, the draw is charged 1 credit', async () => {
    const store = new InMemoryStore();
    const drawFn = vi.fn(async () => draw());
    for (let i = 0; i < ORACLE_FREE_LIMIT; i++) {
      await resolveOracle({ store, userId: 'u1', questionId: `q${i}`, question: `question ${i}`, normalizedInput: 'x', drawFn });
    }
    await oracleTopUp(store, 'u1', 3, 'order-1');

    const outcome = await resolveOracle({
      store, userId: 'u1', questionId: 'qN', question: 'one more', normalizedInput: 'x', drawFn,
    });

    expect(outcome.kind).toBe('paid');
    expect(await oracleBalance(store, 'u1')).toBe(2);
  });

  it('re-drawing the exact same question (same birth input) reuses the cached answer — no charge, no LLM', async () => {
    const store = new InMemoryStore();
    const drawFn = vi.fn(async () => draw());

    const first = await resolveOracle({
      store, userId: 'u1', questionId: 'crush-1', question: 'Should I text them first?', normalizedInput: 'x', drawFn,
    });
    expect(first.kind).toBe('free');

    const second = await resolveOracle({
      store, userId: 'u1', questionId: 'crush-1', question: 'Should I text them first?', normalizedInput: 'x', drawFn,
    });
    expect(second.kind).toBe('reused');
    expect(drawFn).toHaveBeenCalledTimes(1);
  });

  it('a different questionId for the same birth input is a distinct draw (own free-quota slot)', async () => {
    const store = new InMemoryStore();
    const drawFn = vi.fn(async () => draw());
    await resolveOracle({ store, userId: 'u1', questionId: 'crush-1', question: 'q1', normalizedInput: 'x', drawFn });
    const second = await resolveOracle({ store, userId: 'u1', questionId: 'career-1', question: 'q2', normalizedInput: 'x', drawFn });
    expect(second.kind).toBe('free');
    expect(drawFn).toHaveBeenCalledTimes(2);
  });

  it('drawFn throwing reports "failed" without charging (still within the free quota)', async () => {
    const store = new InMemoryStore();
    const drawFn = vi.fn(async () => { throw new Error('LLM outage'); });

    const outcome = await resolveOracle({
      store, userId: 'u1', questionId: 'crush-1', question: 'q1', normalizedInput: 'x', drawFn,
    });

    expect(outcome.kind).toBe('failed');
    expect(await store.readingsFor('u1')).toHaveLength(0);
  });

  it('drawFn throwing in the paid range does not spend the credit', async () => {
    const store = new InMemoryStore();
    const okDraw = vi.fn(async () => draw());
    for (let i = 0; i < ORACLE_FREE_LIMIT; i++) {
      await resolveOracle({ store, userId: 'u1', questionId: `q${i}`, question: `question ${i}`, normalizedInput: 'x', drawFn: okDraw });
    }
    await oracleTopUp(store, 'u1', 1, 'order-1');
    const failing = vi.fn(async () => { throw new Error('LLM outage'); });

    const outcome = await resolveOracle({
      store, userId: 'u1', questionId: 'qFail', question: 'fails', normalizedInput: 'x', drawFn: failing,
    });

    expect(outcome.kind).toBe('failed');
    expect(await oracleBalance(store, 'u1')).toBe(1); // untouched
  });

  it('a save failure on a paid draw refunds the spent credit and rethrows', async () => {
    const store = new InMemoryStore();
    const okDraw = vi.fn(async () => draw());
    for (let i = 0; i < ORACLE_FREE_LIMIT; i++) {
      await resolveOracle({ store, userId: 'u1', questionId: `q${i}`, question: `question ${i}`, normalizedInput: 'x', drawFn: okDraw });
    }
    await oracleTopUp(store, 'u1', 1, 'order-1');
    vi.spyOn(store, 'saveReading').mockRejectedValueOnce(new Error('db down'));

    await expect(
      resolveOracle({ store, userId: 'u1', questionId: 'qN', question: 'one more', normalizedInput: 'x', drawFn: okDraw }),
    ).rejects.toThrow('db down');
    expect(await oracleBalance(store, 'u1')).toBe(1); // spend + refund cancel out
  });
});
