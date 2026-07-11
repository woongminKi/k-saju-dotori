import type { FullSajuChart } from '../saju-engine';
import type { LlmClient } from '../llm';
import type { NamingRequest, NamingWeights } from '../naming-engine/types';

export type MenuId =
  | 'solo'
  | 'couple'
  | 'love-marriage'
  | 'naming'
  | 'career'
  | 'newyear'
  | 'reunion'
  | 'intimacy';

export const MENU_IDS: MenuId[] = [
  'solo',
  'couple',
  'love-marriage',
  'naming',
  'career',
  'newyear',
  'reunion',
  'intimacy',
];

/** 한 사람의 사주 입력. chartSummary 를 주면 그대로 쓰고, 없으면 buildChartSummary 로 생성. */
export interface BirthChartInput {
  chart: FullSajuChart;
  chartSummary?: string;
}

export type MenuInput =
  | { menu: 'solo'; subject: BirthChartInput }
  | { menu: 'love-marriage'; subject: BirthChartInput }
  | { menu: 'couple'; person: BirthChartInput; partner: BirthChartInput }
  | { menu: 'naming'; request: NamingRequest }
  | { menu: 'career'; subject: BirthChartInput }
  | { menu: 'newyear'; subject: BirthChartInput; year: number }
  | { menu: 'reunion'; person: BirthChartInput; partner: BirthChartInput }
  | { menu: 'intimacy'; person: BirthChartInput; partner: BirthChartInput };

export interface MenuSection {
  id: string;
  title: string;
  /** 음슴체 풀이 본문. 실패·잠금 시 ''. */
  body: string;
  ok: boolean;
}

export interface MenuResult {
  menu: MenuId;
  sections: MenuSection[];
  /** 무료 미리보기. 항상 채워진다(잠금 여부와 무관). */
  teaser: string;
  /** true 면 sections[].body 가 가려진 상태(페이월). */
  locked: boolean;
  promptVersion: string;
  /** 일부 섹션 생성 실패 시 true. */
  partial: boolean;
}

export interface MenuDeps {
  llm: LlmClient;
  /** 섹션별 재시도 횟수(기본 2). */
  moduleRetries?: number;
  /** 결제 해제 여부(기본 false → 페이월로 본문 가림). */
  unlocked?: boolean;
}
