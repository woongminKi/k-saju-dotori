# Phase 4 — solo+oracle E2E (Stub 결제) 첫 배포 증분

## 배경

Phase 3에서 이미 reading-flow(캐시→잔액→생성→차감/환불)·wallet·oracle-flow·`StubPaymentProvider`
전체 플로우가 완성된 상태로 확인됨(코드 레벨). Phase 4는 (1) 이 플로우들의 **플로우 단위 vitest**가
아직 없던 것을 채우고, (2) 실제 브라우저로 입력→결제(stub)→스트리밍→결과→캐시 히트 전 구간을
수동 E2E로 검증하고, (3) 첫 Vercel 프리뷰 배포를 완료하는 작업.

## 1. 플로우 vitest 3종 신규 작성 (33개 테스트, 전부 신규 — 기존엔 0개)

- `web/lib/__tests__/reading-flow.test.ts` (13개): `resolveReading`/`resolveReadingStreaming`의
  캐시→잔액→생성→차감/환불 전 분기 — 잔액부족(insufficient)·정상생성+정확히 1개 차감·캐시
  재사용(추가차감 없음)·만료 캐시 재생성·전체실패(failed, 무차감)·저장실패 시 환불+재throw·
  `DEV_UNLOCK_BYPASS`(잔액게이트 스킵+무차감+무저장) 전부 커버. 스트리밍 변형은 `finalize()`
  호출 전까지 무차감, `finalize()` 시점에 확정 차감되는 것까지 별도 검증.
- `web/lib/__tests__/oracle-flow.test.ts` (8개): `resolveOracle`의 무료 쿼터(`ORACLE_FREE_LIMIT`)
  소진 추적·쿼터 소진 후 크레딧 게이트·유료 차감·동일 질문 재조회(캐시, 무차감)·질문별 독립
  쿼터·LLM 실패 시 무차감(무료/유료 구간 모두)·저장 실패 시 환불.
- `web/lib/__tests__/payment.test.ts` (12개): `StubPaymentProvider` **전체 플로우** —
  createCharge→confirm 지갑 크레딧, confirm 멱등성, 취소된 주문 confirm 시 throw, 이미 확정된
  주문 cancel은 no-op, 실제 리딩 소비까지 이어지는 E2E, 오라클 상품 별도 크레딧, 포인트 적용
  결제(정상/잔여포인트 부족 시 throw), 환불(미사용 전량 시 정상/일부 사용 시 throw/멱등/미결제
  주문은 no-op).
- 작성 중 `tsc --noEmit`에서 잡힌 타입 오류 2건 수정: `payment.test.ts`의 `confirm()` 시그니처가
  구현체 기준 1-인자(인터페이스의 2-인자 아님), `reading-flow.test.ts`의 `menu` 파라미터가
  `string`이 아니라 `MenuId`여야 함.

## 2. 수동 E2E (로컬)

Supabase `service_role` 키가 현재 잘못 입력된 상태(NEEDS_FROM_OWNER.md 🔴 항목)라, 실제 Google
로그인 없이 전체 플로우를 검증하기 위해 `web/.env.local`(gitignore됨)로 Supabase 값을 비워
`InMemoryStore`+`StubAuthProvider` 경로를 강제해 로컬 `pnpm dev`로 검증:

1. `/input` 생년월일 입력(1990-05-15 14:30, New York) → `/result` 무료 티저 — 실제 LLM 호출로
   승인된 보이스·글로서리 용어(Artist's Star, Guardian Star) 정상 출력, CJK 없음.
2. `/menu/solo` 첫 방문 — 잔액 0 → "One credit unlocks this reading... Get credits" 정상 게이팅
   확인(처음엔 `DEV_UNLOCK_BYPASS=1`이 `.env`에서 새어 들어와 게이트를 건너뛰는 걸 발견 →
   `.env.local`에 명시적으로 빈 값 오버라이드하고 서버 재시작해 정정).
3. `/checkout` → 1크레딧 $4.99 선택 → Pay → `/api/checkout/approve` → confirm → `/checkout/success`
   — Stub 결제 전체 플로우 정상.
4. `/menu/solo` 재방문 — 6모듈 전체 스트리밍 생성 완료, 정확히 1크레딧 차감 확인(새 생년월일로
   재확인 시 잔액 0 → 다시 게이팅되는 것으로 교차검증).
5. `/menu/solo` 동일 입력 재방문 — 캐시 히트로 즉시 재사용(추가 차감 없음, 동일 콘텐츠).
6. `/library` — 저장된 리딩이 30일 만료로 정상 표시.
7. `/menu/oracle` — 무료 뽑기 정상 동작("1 free draws left" 카운트다운), 승인된 보이스 톤 확인.

## 3. Vercel 프리뷰 배포

- 프로젝트 `dotori-web`(팀 `woongmins-projects`) 신규 생성. 한국판 `saju-web`에서 문서화된 함정
  ("vercel --prod를 web/에서 직접 실행 금지 — 모노레포 stray 프로젝트 생성")을 피하기 위해
  저장소 **루트**에서 `vercel link` 후 API로 `rootDirectory=web`, `sourceFilesOutsideRootDirectory=true`
  설정(레포 루트 `src/`를 `@engine/*`가 정상 참조하도록) → GitHub(`woongminKi/k-saju-dotori`)
  연결(`vercel git connect`) → env(ANTHROPIC_API_KEY/PII_ENC_KEY/PII_HASH_KEY/NEXT_PUBLIC_SITE_URL,
  Preview 스코프) 설정 — Supabase는 의도적으로 비워둠(service_role 키가 틀린 상태라 설정 시
  런타임에서 실패하므로, 이번 "Stub 결제" 검증 증분에서는 InMemoryStore+StubAuthProvider 경로가
  맞음).
- **버그 발견 및 수정**: 첫 `vercel deploy`가 의도와 달리 프로덕션으로 자동 승격됨(`--target`
  미지정 시 CLI가 main 브랜치 기준으로 production을 기본값으로 잡는 듯) → `--target=preview`로
  재배포해 정정. 이어서 배포된 프리뷰에서 스텁 인증이 전혀 동작하지 않고 "Log in" 상태만
  뜨는 문제 발견 — 근본 원인 조사 끝에 **로컬(gitignore된) `.env`/`web/.env` 파일이 CLI 직접
  배포(`vercel deploy`, git 트리거 아님) 시 업로드되어 대시보드에 설정한 환경변수를 덮어쓰고,
  틀린 Supabase 자격증명이 실제로 활성화되어 SupabaseAuthProvider가 선택됐던 것으로 확인**
  (로컬 `next build && next start`로 프로덕션 빌드를 재현했을 때는 정상 동작 — dev/build 코드
  차이가 아니라 CLI 배포 특유의 파일 업로드 이슈였음이 명확해짐). `.env`/`web/.env`를 임시로
  옮겨두고 재배포하자 즉시 정상화되는 것으로 확정 검증 후, 원본 파일 복구.
  **이 발견은 saju-web 메모리 노트("정답 흐름: git push + vercel redeploy, CLI 직접배포 금지")를
  뒷받침 — 향후 K-saju도 같은 원칙 적용 필요(git 트리거 배포만 사용, 로컬 CLI 직접 배포는
  일회성 검증 용도로만, 매번 로컬 .env 부재 확인 후).**
- 정정된 프리뷰(`https://dotori-1vllxzzks-woongmins-projects.vercel.app`, Protection Bypass
  토큰으로 접근)에서 브라우저 E2E 재실행: 스텁 로그인 정상, 결제(checkout→confirm→success)
  정상, 오라클 무료 뽑기 정상(실제 LLM 호출, 승인된 톤·글로서리 용어 확인).
- **알려진 제약**: Supabase 미설정 상태의 이 프리뷰는 `InMemoryStore`를 쓰므로, 서로 다른
  서버리스 인스턴스 간에는 지갑 잔액/캐시가 유지되지 않는다(같은 웜 인스턴스에 연속 히트할 때만
  일관됨 — 실제로 결제 직후 재확인 시 다른 인스턴스로 라우팅되어 잔액이 초기화되는 것을 목격).
  이는 버그가 아니라 InMemoryStore의 본질적 한계이며, 실제 영속성 검증은 Supabase
  `service_role` 키 정정 후 가능(NEEDS_FROM_OWNER.md 🔴 항목).

## 검증

- `pnpm typecheck`/`pnpm test` (엔진 루트): 변경 없음, 기존대로 그린.
- `pnpm typecheck`/`pnpm test` (web/): **25 → 28 test files, 101 → 134 tests, 0 failed.**
- `pnpm build` (web/): 정상.
- Vercel 프리뷰: 빌드 성공, 스텁 인증·결제·솔로 리딩·오라클 무료 뽑기 전부 실동작 확인.

## 남은 항목

- Supabase `service_role` 키 정정 필요(NEEDS_FROM_OWNER.md 🔴, 실제 영속 스토어 검증의 전제조건).
- 향후 배포는 git push 트리거 방식만 사용할 것(CLI 직접 배포 시 로컬 .env 노출 위험 재확인됨).
