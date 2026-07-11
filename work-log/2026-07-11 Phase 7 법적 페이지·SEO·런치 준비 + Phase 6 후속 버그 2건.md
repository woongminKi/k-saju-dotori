# Phase 7 — 법적 페이지·SEO·런치 준비 (+ Phase 6 후속 실LLM E2E에서 발견한 버그 2건)

> 날짜: 2026-07-11

## Phase 6 후속 — 실 브라우저 E2E로 발견한 버그 2건

Phase 6가 완료·커밋된 뒤, team-lead의 원 지시(궁합방 멀티플레이 E2E, love-marriage/career 실LLM 1회씩, 공유카드, 리퍼럴 E2E)를 로컬 브라우저로 실제 구동해 검증하는 과정에서 지금까지 아무 테스트도 잡아내지 못한 실버그 2건을 발견·수정:

1. **`web/.env`에 `ANTHROPIC_API_KEY` 누락**: `web/.env.example`엔 필수 항목으로 문서화돼 있었지만 실제 `web/.env`엔 없었음. 유닛/통합 테스트는 전부 목(mock) LLM 클라이언트를 주입해 `resolveLlm()`의 실키 체크를 타지 않으므로 지금까지 아무도 못 잡음 — 결제 게이트를 실제로 통과해 실 LLM 호출까지 가는 라이브 브라우저 테스트에서만 드러남. 로컬 `web/.env`에 키 추가로 해결(배포 프리뷰는 Vercel 대시보드 별도 설정이라 영향 없었을 것으로 추정).
2. **`love-marriage`·`career`·`couple` 3개 메뉴의 섹션 제목이 한글로 하드코딩**: `src/menus/{love-marriage,career,couple}.ts`가 `generateSection(menu, '연애·결혼운'/'직업·적성운'/'궁합', ...)`처럼 title 인자에 한글 리터럴을 그대로 넘기고 있었음. `_generate-section.ts`의 `hasCjkLeak` 가드는 LLM이 생성한 body만 검사하고 호출자가 넘긴 title은 검사 대상이 아니라서, 이 리터럴은 Phase 0~6 내내 전혀 걸러지지 않았음(Phase 1에서 이 세 파일의 chartSummary/prompts/teaser는 전부 `-en` 버전으로 교체했지만, title 인자만 놓친 케이스). solo 메뉴는 `modules-en.ts`의 모듈 스펙이 전부 영어 title이라 문제없음. 실제로 `/menu/love-marriage` 브라우저 렌더에서 "Love & Marriage연애·결혼운"처럼 한글이 그대로 노출되는 걸 확인 후 수정 — 웹 레이어가 이미 쓰고 있는 영어 라벨과 맞춰 `'Love & Marriage'`/`'Career & Calling'`/`'Compatibility'`로 교체. 어떤 테스트도 title 값 자체를 단언하지 않아 테스트 수정 불필요, 재검증 통과.

두 버그 모두 "이밸 하네스로는 통과했지만 웹 UI로 실제 구동해야만 드러나는" 유형 — team-lead가 Phase 6 지시에서 "eval-tested, never driven through the web UI"를 굳이 짚었던 이유가 정확히 맞아떨어짐.

## Phase 7 — 한 일

1. **법적 페이지 실제 카피** (`web/app/{terms,privacy,refund}/page.tsx`): TODO(P7) 배너·플레이스홀더 제거, 실 런치 카피로 교체.
   - Terms: 엔터테인먼트 전용 면책을 1번 섹션으로 전진 배치, 13세 이상 요건, 크레딧 양도불가/30일 보존, 이용수칙, 변경·해지, Governing law에 `[OWNER: insert governing jurisdiction/state/country and courts]`.
   - Privacy: 수집 항목(생년월일시·장소·성별 암호화 저장, Google 계정 id, 주문기록)·목적·보존기간, "개인정보 판매 안 함" 명시, 서브프로세서(Supabase/Vercel/Anthropic, 결제사는 추후), GDPR(법적 근거·EU/UK 권리) + `[OWNER: DPO/EU 대리인 확인]`.
   - Refund: 미사용 크레딧 14일 환불(EU 통신판매 규정 친화적 문구), 생성완료 리딩은 환불불가, 생성실패 시 무과금(코드 검증됨, `reading-flow.ts` 확인 후 기술) 명시.
2. **결과 화면 엔터테인먼트 디스클레이머**: `MenuResultView.tsx`(솔로/커플/연애/직업/궁합 전부 커버)와 `result/page.tsx`(무료 티저, 별도 렌더라 따로 추가) 하단에 한 줄 추가.
3. **`web/vercel.json` 신규 생성**: 한국판 참조 형태 그대로(`retention/sweep` 매일, `payments/reconcile` 15분마다) — 두 라우트 모두 K-saju에 실존 확인. Vercel Root Directory가 `web`이라 `web/vercel.json`에 배치.
4. **SEO/메타 점검**: 기존 `layout.tsx`(JSON-LD Organization/WebSite/WebApplication)·`sitemap.ts`·`robots.ts`(AI 크롤러 허용목록 포함)는 이미 완성도 높아 그대로 유지. title 메타데이터가 없던 15개 페이지에 최소 title 추가(checkout 계열, compat room 계열, library, result 등).
5. **`LAUNCH_CHECKLIST.md` 신규**: Owner-blocked(도메인·사업자정보·서포트이메일·Stripe키·Google OAuth 최종확인·Anthropic 키 분리결정·Governing law·DPO·Vercel 프로덕션 승격) / Engineering(Stripe 통합·프로덕션 env·Rate limiting 부재·에러 모니터링 미설정·최종 build 리그레션) 두 섹션. 코드 그렙으로 실제 존재 여부 확인 후 작성(rate limiting·모니터링 모두 "없음"으로 정직하게 기록).
6. **전체 리그레션**: 루트 `pnpm typecheck`·`pnpm test`(36파일/246테스트) · 웹 `pnpm typecheck`·`pnpm test`(28파일/159테스트, Supabase 계약 37개는 스킵 — 타팀 소관) · `pnpm build` 전부 그린.

## 동시성 노트 — 공유 작업 트리 충돌 관찰

Phase 5(Stripe, task #17)를 동시에 진행 중인 별도 에이전트가 `web/lib/payment-stripe.ts`+`services.ts` 배선 도중, 아직 `stripe` 패키지가 install 되지 않은 순간에 내 로컬 dev 서버가 그 파일을 물어 500 에러가 난 것을 목격(내 작업과 무관 — `stripe` 의존성은 원 플랜 승인 시점에 이미 승인됨). 잠시 후 그쪽의 `pnpm install`이 끝나며 자연 해소됨. 별도 git worktree 없이 같은 작업 트리를 여러 에이전트가 공유하는 현재 구조에서, 의존성 설치 같은 원자적이지 않은 변경 중에는 이런 순간적 충돌이 재현될 수 있음 — team-lead 참고용으로 기록. 내 쪽 파일(`web/lib/services.ts` 등 Stripe 관련)은 건드리지 않았고, `git status`로 스테이징도 분리해 확인함.

## 검증

- 루트: `pnpm typecheck` 클린 · `pnpm test` 36파일/246테스트.
- 웹: `pnpm typecheck` 클린 · `pnpm test` 28파일/159테스트(37 스킵) · `pnpm build` 클린.
- 라이브 브라우저 재검증(로컬 dev, InMemoryStore + DEV_UNLOCK_BYPASS=1): `/menu/career` 실 LLM 호출 → "Career & Calling" 영어 제목·용어집 기반 영어 본문·디스클레이머 정상 렌더 확인.

## 다음

- Owner-blocked 항목은 `LAUNCH_CHECKLIST.md`/`NEEDS_FROM_OWNER.md` 참고.
- 스테이지만 완료(`git add`), 커밋은 사용자 명시 요청 대기. Stripe 관련 파일(`web/lib/payment-stripe.ts`·`services.ts`·`web/app/api/webhooks/`·`package.json`·`pnpm-lock.yaml`)은 담당 에이전트 소관이라 미스테이징.
