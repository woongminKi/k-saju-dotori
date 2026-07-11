import 'server-only';
import { randomUUID } from 'node:crypto';
import type { OracleDraw } from '@engine/oracle';
import type { Store } from './store';
import { oracleBalance, oracleSpend, oracleRefund } from './oracle-wallet';
import { birthHash, encryptPII } from './pii';

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ORACLE_MENU = 'oracle';
/** Number of free draws. After this, oracle credits are charged. */
export const ORACLE_FREE_LIMIT = 2;

export type OracleOutcome =
  | { kind: 'reused'; draw: OracleDraw }
  | { kind: 'free'; draw: OracleDraw; freeLeft: number }
  | { kind: 'paid'; draw: OracleDraw }
  | { kind: 'needCredit' }
  | { kind: 'failed' };

export interface ResolveOracleInput {
  store: Store;
  userId: string;
  questionId: string;
  question: string;
  /** Normalized birth input used for the birthHash + at-rest encryption. */
  normalizedInput: string;
  /** Runs the oracle draw (LLM call). */
  drawFn: () => Promise<OracleDraw>;
  now?: number;
}

export async function resolveOracle(input: ResolveOracleInput): Promise<OracleOutcome> {
  const now = input.now ?? Date.now();
  const hash = birthHash(ORACLE_MENU, `${input.normalizedInput}|${input.questionId}`);

  // 1. Same question already drawn (non-expired) -> free re-view — no charge, no LLM.
  const existing = await input.store.findReading(input.userId, ORACLE_MENU, hash);
  if (existing && existing.expiresAt > now) {
    return { kind: 'reused', draw: JSON.parse(existing.resultJson) as OracleDraw };
  }

  // 2. Free-quota check — counted by the number of saved (non-expired) oracle draws.
  const priorDraws = (await input.store.readingsFor(input.userId)).filter(
    (r) => r.menu === ORACLE_MENU && r.expiresAt > now,
  ).length;
  const isFree = priorDraws < ORACLE_FREE_LIMIT;

  // 3. In the paid range, check credit — none means paywall without an LLM call.
  if (!isFree && (await oracleBalance(input.store, input.userId)) < 1) {
    return { kind: 'needCredit' };
  }

  // 4. Generate
  let draw: OracleDraw;
  try {
    draw = await input.drawFn();
  } catch {
    return { kind: 'failed' };
  }

  // 5. If paid, charge and save. (refund compensation if save fails)
  if (!isFree) await oracleSpend(input.store, input.userId, ORACLE_MENU);
  try {
    await input.store.saveReading({
      id: randomUUID(),
      userId: input.userId,
      menu: ORACLE_MENU,
      birthHash: hash,
      encryptedInputs: encryptPII(`${input.normalizedInput}|${input.questionId}`),
      resultJson: JSON.stringify(draw),
      createdAt: now,
      expiresAt: now + RETENTION_MS,
    });
  } catch (e) {
    if (!isFree) await oracleRefund(input.store, input.userId, ORACLE_MENU);
    throw e;
  }

  return isFree
    ? { kind: 'free', draw, freeLeft: ORACLE_FREE_LIMIT - priorDraws - 1 }
    : { kind: 'paid', draw };
}
