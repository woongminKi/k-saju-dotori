export type Element = '木' | '火' | '土' | '金' | '水';
export type YinYang = '음' | '양';
export type SuriFortune = '길' | '흉' | '반길';
export type DollimjaPos = '가운데' | '끝';
export interface Pillar { stem: string; branch: string; hiddenStems: { ki: string; jung?: string; yeo?: string } }
export interface SajuChart { pillars: { year: Pillar; month: Pillar; day: Pillar; hour?: Pillar }; timeUnknown: boolean }  // 만세력 엔진(별도)이 산출, 이 엔진은 입력으로만 받음
export interface BabyBirth { datetime: string; isLunar: boolean; isLeapMonth: boolean; timeUnknown: boolean }  // 만세력 엔진에 넘기기 전 raw 입력 — 이 엔진 외부에서 SajuChart로 변환
export interface CandidatePair { first: string; second: string }
export interface SupplementTarget { elements: Element[]; rationale: string; lowConfidence: boolean; parentHarmonyNote?: string }
export interface NameWarning { code: string; severity: '경고' | '주의'; message: string }
export interface NameFacts { strokes: [number, number]; wonElements: [Element, Element]; yinYangs: [YinYang, YinYang]; meanings: [string[], string[]]; soundFlow: Element[]; suriFourFortunes: SuriFortune[]; freqRank: number | null }
export interface NameCheckReport { ok: boolean; warnings: NameWarning[]; facts: NameFacts }
export interface ScoreBreakdown { s1_wonElement: number; s2_suri: number; s3_sound: number; s4_yinYang: number; s5_freq: number; s6_pref: number }
export interface ScoredCandidate { pair: CandidatePair; score: number; breakdown: ScoreBreakdown }
/** 결과에 박는 데이터 버전 메타 — 가짜 객관성 회피·재현성. PRD §3.4·§9. */
export interface DataVersion {
  /** 인명용 한자 데이터 출처·버전. fixture 는 'fixture', 실데이터는 hanja-version.txt 의 1줄. */
  hanja: string;
  /** 만세력 라이브러리 버전. e.g. '@fullstackfamily/manseryeok@1.0.8'. */
  mansaeryeok: string;
  /** 이름 빈도 코퍼스 버전. fixture 는 'fixture', 실데이터는 source.fileSha256[0] 또는 generatedAt. */
  nameFrequency: string;
}
export interface NameValidationResult {  // V 모드 출력
  given: CandidatePair; hangul: string; facts: NameFacts; supplementTarget: SupplementTarget; score: number; breakdown: ScoreBreakdown;
  fitText: string; warningsText: string; suggestionText: string;
  flags: { lowConfidence: boolean; humanReviewNeeded: boolean }; weightsVersion: string; promptVersion: string; dataVersion: DataVersion;
}
export interface RankedName { pair: CandidatePair; rank: number; rationale: string }  // G 모드 중간
export interface ValidatedName extends RankedName { hangul: string; facts: NameFacts; supplementScore: number }  // G 모드 출력 항목
export interface NamingResult { candidates: ValidatedName[]; supplementTarget: SupplementTarget; flags: { lowConfidence: boolean; humanReviewNeeded: boolean; relaxedConstraints: boolean }; weightsVersion: string; promptVersion: string; dataVersion: DataVersion }
export interface NamingRequest {
  mode: 'V' | 'G';
  babyChart: SajuChart;                                  // 이미 만세력 엔진으로 변환된 차트
  surname: string;                                       // 한 글자 한자
  gender: '남' | '여';
  givenName?: CandidatePair;                              // V 모드 필수
  parents?: { mother?: SajuChart; father?: SajuChart };  // 선택
  dollimja?: { char: string; pos: DollimjaPos };         // G 모드용(V 모드도 검사 시 참고 가능)
  avoidList?: { sounds?: string[]; hanja?: string[]; meanings?: string[]; names?: string[] };
  prefs?: { likedSounds?: string[]; likedImages?: string[]; siblingNames?: string[] };
}
export interface NamingWeights { version: string; w1: number; w2: number; w3: number; w4: number; w5: number; w6: number; K: number; N: number; M: number }
