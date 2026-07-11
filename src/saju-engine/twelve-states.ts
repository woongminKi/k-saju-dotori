// 12운성(포태법) — 관례표 (출처: 통용 포태법, 버전 2026-06-29). 결정적.
import { stemPolarity, branchIndex } from './_stem-branch';
import type { TwelveState } from './types';

const STATE_ORDER: TwelveState[] = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'];

const JANGSAENG_BRANCH_INDEX: Record<string, number> = {
  甲: 11, 丙: 2, 戊: 2, 庚: 5, 壬: 8,
  乙: 6, 丁: 9, 己: 9, 辛: 0, 癸: 3,
};

export function twelveStateOf(dayStem: string, branch: string): TwelveState {
  const start = JANGSAENG_BRANCH_INDEX[dayStem];
  if (start === undefined) throw new Error(`twelve-states: 알 수 없는 천간 "${dayStem}"`);
  const bi = branchIndex(branch);
  const forward = stemPolarity(dayStem) === '양';
  const step = forward ? (bi - start + 12) % 12 : (start - bi + 12) % 12;
  return STATE_ORDER[step]!;
}
