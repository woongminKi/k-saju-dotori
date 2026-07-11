'use server';
import { track } from '@vercel/analytics/server';
import { getAuth, getStore } from '../../../lib/services';
import { computeOracleDraw } from '../../../lib/engine';
import { resolveOracle } from '../../../lib/oracle-flow';
import { normalizeBirthFields, type BirthFields } from '../../../lib/birth-params';
import { findQuestion } from '@engine/oracle';

export interface DrawArgs {
  birth: BirthFields;
  questionId: string;
}

export type DrawActionResult =
  | { kind: 'ok'; answer: string; reason: string; question: string; freeLeft: number | null }
  | { kind: 'needCredit' }
  | { kind: 'failed' }
  | { kind: 'error'; message: string };

export async function drawOracleAction(args: DrawArgs): Promise<DrawActionResult> {
  const question = findQuestion(args.questionId);
  if (!question) return { kind: 'error', message: 'That question doesn’t look right.' };

  const user = await getAuth().getCurrentUser().catch(() => undefined);
  if (!user) return { kind: 'error', message: 'Please log in first.' };

  let normalized: string;
  try {
    normalized = normalizeBirthFields(args.birth);
  } catch {
    return { kind: 'error', message: 'Please check your birth details.' };
  }

  try {
    const outcome = await resolveOracle({
      store: getStore(),
      userId: user.id,
      questionId: args.questionId,
      question: question.text,
      normalizedInput: normalized,
      drawFn: () => computeOracleDraw(args.birth, question.text),
    });

    switch (outcome.kind) {
      case 'reused':
        return {
          kind: 'ok',
          answer: outcome.draw.answer,
          reason: outcome.draw.reason,
          question: question.text,
          freeLeft: null,
        };
      case 'free':
        await track('oracle_draw').catch(() => {});
        return {
          kind: 'ok',
          answer: outcome.draw.answer,
          reason: outcome.draw.reason,
          question: question.text,
          freeLeft: outcome.freeLeft,
        };
      case 'paid':
        await track('oracle_draw').catch(() => {});
        return {
          kind: 'ok',
          answer: outcome.draw.answer,
          reason: outcome.draw.reason,
          question: question.text,
          freeLeft: null,
        };
      case 'needCredit':
        return { kind: 'needCredit' };
      case 'failed':
        return { kind: 'failed' };
    }
  } catch {
    return { kind: 'failed' };
  }
}
