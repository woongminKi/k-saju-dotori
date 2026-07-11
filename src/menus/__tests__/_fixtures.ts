import type { FullSajuChart } from '../../saju-engine';
import type { LlmClient } from '../../llm';

/** reading/menus 테스트용 최소 유효 FullSajuChart. */
export function fakeChart(): FullSajuChart {
  const pillar = (stem: string, branch: string) => ({ stem, branch, hiddenStems: { ki: stem } });
  return {
    base: {
      pillars: {
        year: pillar('甲', '子'),
        month: pillar('丙', '寅'),
        day: pillar('戊', '午'),
        hour: pillar('庚', '申'),
      },
      timeUnknown: false,
    },
    dayStem: '戊',
    tenGods: {
      year: { stem: '편관', branch: '정재' },
      month: { stem: '편인', branch: '편관' },
      day: { stem: null, branch: '정인' },
      hour: { stem: '식신', branch: '식신' },
    },
    twelveStates: { year: '태', month: '장생', day: '제왕', hour: '병' },
    elements: { 木: 2, 火: 2, 土: 1, 金: 2, 水: 1 },
    sinsal: ['도화', '천을귀인'],
    daewoon: { forward: true, startAge: 3, steps: [{ age: 3, stem: '丁', branch: '卯' }] },
  };
}

/** 프롬프트(및 옵션)를 받아 문자열을 돌려주는 결정적 mock LlmClient. */
export function mockLlm(responder: (prompt: string, options?: unknown) => string): LlmClient {
  return {
    complete: async (prompt: string, options?: unknown) => responder(prompt, options),
  };
}
