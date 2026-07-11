// English placeholder oracle question presets.
// TODO(Phase 2): port the full 6-category x 20-question catalog (mirrors Korean oracle/questions.ts).

export interface OracleQuestion {
  id: string;
  text: string;
}

export interface OracleCategory {
  id: string;
  label: string;
  emoji: string;
  questions: OracleQuestion[];
}

export const ORACLE_CATEGORIES: OracleCategory[] = [
  {
    id: 'love',
    label: 'Love & relationships',
    emoji: '💗',
    questions: [
      { id: 'love-1', text: 'Will I meet someone new this year?' },
      { id: 'love-2', text: 'Should I confess my feelings to the person I like?' },
      { id: 'love-3', text: 'Should I keep seeing this person?' },
    ],
  },
  {
    id: 'career',
    label: 'Work & career',
    emoji: '💼',
    questions: [
      { id: 'career-1', text: 'Should I change jobs this year?' },
      { id: 'career-2', text: 'Should I stay at my current job?' },
      { id: 'career-3', text: 'Is now a good time to start a business?' },
    ],
  },
];

const QUESTION_INDEX: Map<string, OracleQuestion> = new Map(
  ORACLE_CATEGORIES.flatMap((c) => c.questions.map((q) => [q.id, q] as const)),
);

/** Look up a question by id. Undefined if not found. */
export function findQuestion(id: string): OracleQuestion | undefined {
  return QUESTION_INDEX.get(id);
}
