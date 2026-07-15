# 사용자(오너) 제공 필요 항목

> 이 파일은 진행 중 계속 갱신됩니다. ✅ = 해결됨, ⏳ = 아직 필요 없음(도달 시 요청), 🔴 = 지금 블로킹.

| 상태 | 항목 | 용도 | 필요 시점 | 제공 방법 |
|---|---|---|---|---|
| ✅ | Anthropic API 키 | LLM 리딩 생성·이밸 | Phase 2 | 한국판 키 재사용 결정(2026-07-11). 로컬 .env로만 사용, 커밋 금지 |
| ✅ | Supabase service_role 키 | 서버 DB 접근(RLS deny-all 우회) | Phase 3 검증 | 2026-07-11 정상 키 수령·web/.env 반영·인증 200 확인 완료 |
| ✅ | 마이그레이션 SQL 실행(0001) | DB 테이블 생성 | — | 2026-07-11 사용자가 SQL Editor에서 실행 완료. 테이블 9종 생성·RLS deny-all(service 삽입→anon 차단) 실검증 통과 |
| 🔴 | **마이그레이션 SQL 실행(0002)** | 레이트리밋 테이블 생성 | 런치 하드닝 — 지금 사실상 무방비 상태 | `supabase/migrations/0002_rate_limits.sql`을 0001과 동일한 절차로 SQL Editor에 붙여넣기 실행 필요(0001 파일은 수정하지 않음 — 순수 추가 마이그레이션). `rate_limits` 테이블 1개 + RLS deny-all + `increment_rate_limit` 함수 생성. **주의**: web/.env에 이미 실 Supabase 자격증명이 있으므로 레이트리밋은 "인메모리 폴백"이 아니라 Supabase RPC 경로를 무조건 시도함 — 이 마이그레이션 실행 전까지는 RPC가 (테이블 없음으로) 매번 실패 → fail-open 설계상 매 요청이 그냥 통과됨(서비스는 안 죽지만 **레이트리밋이 사실상 전혀 걸리지 않는 상태**). 무료 티저·오라클처럼 실 LLM 비용이 나가는 엔드포인트가 보호되길 원한다면 가능한 빨리 실행 필요 |
| ✅ | Google Cloud OAuth 클라이언트 | Google 로그인 | Phase 3 검증 | 사용자가 Supabase 대시보드에 직접 설정 완료(2026-07-11). 로그인 라운드트립 테스트에서 최종 확인 예정 |
| ✅ | Vercel 신규 프로젝트 | 프리뷰 배포 | Phase 4 | 2026-07-11 완료: `dotori-web`(팀 woongmins-projects) 생성, Root Directory=`web`+sourceFilesOutsideRootDirectory로 `@engine` 참조 정상 빌드 확인, GitHub(`woongminKi/k-saju-dotori`) 연결 완료. 프리뷰 배포·solo+oracle E2E 스모크 테스트 통과(Phase 4 리포트 참고). ⚠️ Supabase 미설정 상태라 이 프리뷰는 InMemoryStore(무상태)로 동작 — 지갑/캐시가 요청 간 유지 안 됨(서버리스 인스턴스 비고정). 위 service_role 키 정정 후 실제 영속 스토어로 전환 필요 |
| ✅ | Polar 가입 + 샌드박스 조직 access token + 웹훅 시크릿 | 결제 (신규 주 결제수단) | Phase 5(개정) 검증 | 2026-07-12 완료. 샌드박스 조직 "dotori" — 상품 6개 생성, 웹훅 등록·실서명 검증, 테스트카드 실결제→크레딧 지급→환불→회수 E2E 완주(커밋 4df713c). web/.env가 이 샌드박스 자격증명으로 로컬 개발에 계속 사용됨 — **삭제 금지** |
| 🔴 | **Polar 프로덕션 정산 계좌 연결(Stripe Connect) = 심사 시작** | 실결제 활성화 | 런치 전 (심사 1~2주 소요라 지금이 크리티컬 패스) | 프로덕션 조직 "woong's company" 대시보드 좌측 Finance(또는 온보딩 체크리스트 payout 단계) → Stripe Connect 온보딩에서 본인 신원 + 한국 은행 계좌 입력. 이걸 해야 판매자 심사 시계가 돌기 시작. 심사 중 운세류 콘텐츠 질문이 오면 "소프트웨어 자동 생성 + 엔터테인먼트" 프레임 유지, 추가 자료(데모 영상 등)는 팀이 제작 지원 |
| ✅ | Polar 프로덕션 access token | 실결제 | 런치 | 2026-07-13 수령(조직 "woong's company", 이름 유지 결정). 프로덕션 상품 6개 생성 완료·GET 재조회 검증 통과. 토큰+상품ID는 `web/.env.production.local`(gitignored)에 보관 — 런치 시 Vercel 프로덕션 env로 복사 |
| ✅ | Polar 프로덕션 웹훅 시크릿 | 실결제 | 런치 | 2026-07-13 완료 — 웹훅 엔드포인트 API 등록(id 48efcd35, url `dotori-web.vercel.app/api/payments/polar/webhook`, 이벤트 3종), 시크릿은 `web/.env.production.local`에 반영. 도메인 확정 시 엔드포인트 url만 PATCH(시크릿 불변). ⚠️ Vercel 배포 보호(로그인 보호)가 켜져 있는 동안은 웹훅 POST가 차단됨 — 런치 시 보호 해제 또는 웹훅 경로 예외 필요 |
| 🟤 | ~~Stripe 계정 + 테스트 키~~ (휴면 — Polar로 대체) | 결제 | — | **휴면 처리.** Stripe는 미국 법인/사업자가 있어야 가입 가능 → 오너가 아직 미보유하여 Polar(MoR, 한국 판매자 공식 지원)로 전환 결정. `StripePaymentProvider`/웹훅/테스트 코드는 **삭제하지 않고 보존** — 향후 미국 법인 확보 시 부활 가능. Polar 미설정 시에만 폴백으로 동작 |
| 🟤 | ~~Stripe 라이브 키~~ (휴면 — Polar로 대체) | 실결제 | — | 위와 동일하게 휴면. 미국 법인 확보 후 부활 시 필요 |
| ⏳ | 법인/사업자 정보 + 서포트 이메일 | Terms·Privacy·Polar 프로필 | Phase 7 | 상호(개인/법인), 소재 국가, 연락 이메일 |
| ⏳ | 도메인 | 프로덕션 URL | Phase 7 | 예: dotori.app 등 구매 여부 결정 |

> 🟤 = 보존된 휴면 항목(과거 이력, 조건 충족 시 부활 가능).

## 결정 대기 (돈 안 드는 것)

- ✅ 오라클 크레딧 팩 최종 구성(개정): 12/30/80개 = $1.99/$2.99/$5.99, 리딩 1/3/5장 = $4.99/$11.99/$17.99 — Phase 5(개정) `pricing.ts`에 반영, `PolarPaymentProvider`가 사용. (구 오라클 구성 5/12/30 = $0.99/$1.99/$2.99에서 변경됨)
- ⚠️ Polar 부분 포인트 사용 제약: Polar 상품은 고정가라 체크아웃 단위 할인이 불가 → `PolarPaymentProvider`는 포인트를 **전액 사용(무료화) 또는 미사용**만 허용하고, 부분 사용(0 < 결제액 < 정가)은 거부함(과금 오류 방지). 필요 시 체크아웃 UI에서 Polar 활성 시 부분 포인트 입력을 비활성화하는 후속 작업 검토(현재 Polar 미설정이라 런타임 영향 없음)
- Phase 2 완료 시 영어 리딩 톤 리뷰 (트랜스크립트 발췌 보여드림)
