import 'server-only';
import { randomUUID } from 'node:crypto';
import type { MenuResult } from '@engine/menus/types';
import type { StartedMenu, StartedMenuSection } from '@engine/menus/solo';
import type { Store } from './store';
import { balance, spend, refund } from './wallet';
import { birthHash, encryptPII } from './pii';
import { enforceRateLimit, userKey } from './rate-limit';

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type ReadingOutcome =
  | { kind: 'reused'; result: MenuResult }
  | { kind: 'insufficient' }
  | { kind: 'generated'; result: MenuResult }
  | { kind: 'rateLimited' }
  | { kind: 'failed' };

export interface ResolveReadingInput {
  store: Store;
  userId: string;
  menu: string;
  /** Normalized birth input used for the birthHash + at-rest encryption. */
  normalizedInput: string;
  /** Engine call that generates the unlocked (full) reading. */
  computeUnlocked: () => Promise<MenuResult>;
  now?: number;
}

function hasBody(result: MenuResult): boolean {
  return result.sections.some((s) => s.ok && s.body.length > 0);
}

export async function resolveReading(input: ResolveReadingInput): Promise<ReadingOutcome> {
  const now = input.now ?? Date.now();
  const hash = birthHash(input.menu, input.normalizedInput);

  // 1. Existing (non-expired) reading -> free re-view (no charge, no LLM)
  const existing = await input.store.findReading(input.userId, input.menu, hash);
  if (existing && existing.expiresAt > now) {
    return { kind: 'reused', result: JSON.parse(existing.resultJson) as MenuResult };
  }

  // Dev bypass: skip the payment gate and show the full reading (no charge, no save). Env flag only.
  // Ignored in production so a stray env var can never disable the whole paywall.
  if (process.env['DEV_UNLOCK_BYPASS'] === '1' && process.env['NODE_ENV'] !== 'production') {
    return { kind: 'generated', result: await input.computeUnlocked() };
  }

  // 2. Balance check — if 0, go straight to teaser/CTA without an LLM call
  if ((await balance(input.store, input.userId)) < 1) {
    return { kind: 'insufficient' };
  }

  // 2b. Rate-limit the actual generation (expensive LLM call), keyed by the paying user. Cached
  // re-views and the no-credit paywall path above are intentionally not counted.
  if (!(await enforceRateLimit('paidReading', userKey(input.userId))).allowed) {
    return { kind: 'rateLimited' };
  }

  // 3. Generate
  const result = await input.computeUnlocked();
  if (!hasBody(result)) {
    return { kind: 'failed' }; // total failure -> no charge
  }

  // 4. Charge + save (atomic: refund compensation if save fails)
  await spend(input.store, input.userId, input.menu);
  try {
    await input.store.saveReading({
      id: randomUUID(),
      userId: input.userId,
      menu: input.menu,
      birthHash: hash,
      encryptedInputs: encryptPII(input.normalizedInput),
      resultJson: JSON.stringify(result),
      createdAt: now,
      expiresAt: now + RETENTION_MS,
    });
  } catch (e) {
    await refund(input.store, input.userId, input.menu);
    throw e;
  }
  return { kind: 'generated', result };
}

// ── Streaming variant — stream section promises to the UI, then charge/save after completion ──────

export type FinalizeOutcome =
  | { kind: 'saved' } // charged + saved
  | { kind: 'failed' } // total failure (no body) -> no charge, no save
  | { kind: 'bypass' }; // DEV_UNLOCK_BYPASS -> no charge, no save

export type StreamingReadingOutcome =
  | { kind: 'reused'; result: MenuResult }
  | { kind: 'insufficient' }
  | { kind: 'rateLimited' }
  | {
      kind: 'streaming';
      sections: StartedMenuSection[];
      /** Waits for full generation, then charges/saves. Refunds then throws if save fails (same invariant). */
      finalize: () => Promise<FinalizeOutcome>;
    };

export interface ResolveReadingStreamingInput {
  store: Store;
  userId: string;
  menu: string;
  normalizedInput: string;
  /** Engine call that starts the unlocked (full) reading. Only invoked after the gate passes. */
  startUnlocked: () => StartedMenu;
  now?: number;
}

/**
 * Streaming variant of resolveReading. Keeps the same wallet invariants:
 *   free re-view / no generation when balance is 0 / no charge on total failure / refund if save fails.
 * The charge happens after full generation (finalize), so leaving mid-way ends without a charge.
 */
export async function resolveReadingStreaming(
  input: ResolveReadingStreamingInput,
): Promise<StreamingReadingOutcome> {
  const now = input.now ?? Date.now();
  const hash = birthHash(input.menu, input.normalizedInput);

  const existing = await input.store.findReading(input.userId, input.menu, hash);
  if (existing && existing.expiresAt > now) {
    return { kind: 'reused', result: JSON.parse(existing.resultJson) as MenuResult };
  }

  const bypass =
    process.env['DEV_UNLOCK_BYPASS'] === '1' && process.env['NODE_ENV'] !== 'production';
  if (!bypass && (await balance(input.store, input.userId)) < 1) {
    return { kind: 'insufficient' };
  }

  // Rate-limit the actual generation, keyed by the paying user (see resolveReading). The dev bypass
  // path still generates but is dev-only and left uncounted.
  if (!bypass && !(await enforceRateLimit('paidReading', userKey(input.userId))).allowed) {
    return { kind: 'rateLimited' };
  }

  const started = input.startUnlocked();
  const finalize = async (): Promise<FinalizeOutcome> => {
    const result = await started.result;
    if (bypass) return { kind: 'bypass' };
    if (!hasBody(result)) return { kind: 'failed' };
    await spend(input.store, input.userId, input.menu);
    try {
      await input.store.saveReading({
        id: randomUUID(),
        userId: input.userId,
        menu: input.menu,
        birthHash: hash,
        encryptedInputs: encryptPII(input.normalizedInput),
        resultJson: JSON.stringify(result),
        createdAt: now,
        expiresAt: now + RETENTION_MS,
      });
    } catch (e) {
      await refund(input.store, input.userId, input.menu);
      throw e;
    }
    return { kind: 'saved' };
  };

  return { kind: 'streaming', sections: started.sections, finalize };
}
