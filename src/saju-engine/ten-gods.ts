// 십신 분류 — 일간 오행 대비 상대 천간의 생극+음양. 통용 명리 규칙(결정적).
import { stemElement, sangSaeng, sangGeuk } from '../naming-engine/_element-tables';
import { stemPolarity } from './_stem-branch';
import type { TenGod } from './types';

export function tenGodOf(dayStem: string, otherStem: string): TenGod {
  const dm = stemElement(dayStem);
  const oe = stemElement(otherStem);
  const same = stemPolarity(dayStem) === stemPolarity(otherStem);

  if (dm === oe) return same ? '비견' : '겁재';
  if (sangSaeng(dm, oe)) return same ? '식신' : '상관';   // 我生
  if (sangGeuk(dm, oe)) return same ? '편재' : '정재';     // 我剋
  if (sangGeuk(oe, dm)) return same ? '편관' : '정관';     // 剋我
  if (sangSaeng(oe, dm)) return same ? '편인' : '정인';   // 生我
  throw new Error(`ten-gods: 분류 불가 (${dayStem}, ${otherStem})`);
}
