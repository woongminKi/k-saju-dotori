import type { Element, Pillar, SajuChart } from '../naming-engine/types';

export type Polarity = '양' | '음';
export type TenGod = '비견' | '겁재' | '식신' | '상관' | '편재' | '정재' | '편관' | '정관' | '편인' | '정인';
export type TwelveState = '장생' | '목욕' | '관대' | '건록' | '제왕' | '쇠' | '병' | '사' | '묘' | '절' | '태' | '양';
export type SinsalCode = '도화' | '홍염' | '역마' | '화개' | '천을귀인';

export interface ElementCount { 木: number; 火: number; 土: number; 金: number; 水: number }

export interface PillarTenGods {
  stem: TenGod | null;
  branch: TenGod;
}

export interface DaewoonStep { age: number; stem: string; branch: string }

export interface FullSajuChart {
  base: SajuChart;
  dayStem: string;
  tenGods: { year: PillarTenGods; month: PillarTenGods; day: PillarTenGods; hour?: PillarTenGods };
  twelveStates: { year: TwelveState; month: TwelveState; day: TwelveState; hour?: TwelveState };
  elements: ElementCount;
  sinsal: SinsalCode[];
  daewoon: { forward: boolean; startAge: number; steps: DaewoonStep[] };
}

export type { Element, Pillar, SajuChart };
