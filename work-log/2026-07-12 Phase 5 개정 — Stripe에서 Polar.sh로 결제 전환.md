# Phase 5 개정 — 결제 프로바이더를 Stripe에서 Polar.sh로 전환

## 배경

오너 결정: Stripe는 가입에 미국 법인/사업자가 필요한데 오너는 아직 이를 보유하지 않아 사용 불가.
Polar.sh로 전환 — Merchant of Record(MoR) 모델이라 한국 판매자를 공식 지원하고(정산은 Stripe
Connect Express 경유), 샌드박스 환경은 심사 없이 가입 즉시 사용 가능. 기존 Stripe 작업(2026-07-11)은
버리지 않고 그대로 보존 — `web/lib/payment-stripe.ts`/웹훅/테스트 전부 무손상 유지, 향후 미국 법인
확보 시 부활 가능하도록 폴백 경로에 남겨둠.

## 사전 조사

구현 전 팀리드의 리서치 메모를 그대로 신뢰하지 않고 Polar 공식 문서를 직접 확인:
- 체크아웃 생성 API(`POST /v1/checkouts/`) 요청/응답 스키마 — `products`가 단일 ID가 아니라
  **배열**이라는 점 확인(팀리드 메모는 단수형이었음).
- 웹훅 서명 — Polar가 구현하는 Standard Webhooks 스펙 원문(github.com/standard-webhooks)에서
  헤더명(`webhook-id`/`webhook-timestamp`/`webhook-signature`)·서명 대상 문자열
  (`{id}.{timestamp}.{rawBody}`)·시크릿이 `whsec_` 접두사+base64(디코드 필요, 문서가 "흔한
  실수"로 명시)·`v1,<sig>` 다중 서명 포맷·상수시간 비교 요구사항을 전부 원문으로 확인 후 구현
  브리핑에 반영 — 이 부분이 보안 핵심이라 추정으로 넘기지 않음.
- 이벤트명(`order.paid`/`checkout.expired`/`order.refunded`/`refund.created` 등) 전부 실 문서에서
  확인.
- 부분 포인트 할인 가능성도 별도로 조사: 체크아웃 생성 API의 `amount` 필드가 "custom prices only"로
  문서화되어 있어 임의 할인이 가능한지 확인했으나, 실제로는 상품이 "pay what you want"로 설정된
  경우에만 동작하고, 그 경우 고객이 체크아웃 페이지에서 금액을 직접 수정할 수 있는지 여부가 문서로
  확인되지 않음(실 계정 없이는 검증 불가) — 이 경로는 채택하지 않음(아래 참고).

## 구현

- `web/lib/payment-polar.ts` — `PolarPaymentProvider`(raw `fetch` + `node:crypto`, SDK 없음).
  `payment-stripe.ts`와 1:1 구조 대응: createCharge(체크아웃 생성, id를 pgToken으로 저장, 전액
  포인트 커버 시 Polar 미호출)·confirm(GET 체크아웃, `status==='succeeded'`+금액 이중검증+승자
  기반 `markOrderPaid` 정산)·cancel(Polar 측 조기취소 API 없음 확인 — `markOrderCanceled`만)·
  refund(`assertRefundReclaimable`→환불→`markOrderRefunded`→`reclaimRefund`)·
  reclaimDashboardRefund·reconcilePending.
- `web/lib/polar-webhook.ts` — 순수 함수 `verifyPolarSignature()`로 서명검증 로직 분리(유닛
  테스트 용이). 위 사전조사에서 확인한 알고리즘 그대로 구현 — 실 HMAC 서명을 만들어 실제로
  검증하는 방식으로 테스트(crypto 자체를 모킹하지 않음).
- `web/app/api/payments/polar/webhook/route.ts` — raw body, 서명+타임스탬프(±300초) 검증,
  `order.paid`(정산)/`checkout.expired`(취소)/`order.refunded`(대시보드 환불 동기화) 처리,
  Stripe 웹훅과 동일한 "절대 throw 안 함" 패턴.
- `web/lib/services.ts` — 3단계 우선순위: Polar 설정됨 → PolarPaymentProvider, 아니면 Stripe
  설정됨 → StripePaymentProvider(휴면 폴백), 아니면 Stub.
- **가격 개정(오너 확정)**: 오라클 팩 5/12/30개=$0.99/$1.99/$2.99 → **12/30/80개=$1.99/$2.99/$5.99**
  (Polar 수수료 5%+$0.50/건 구조상 채산성 확보). 리딩 팩은 무변경. UI는 가격 상수를 동적으로
  참조하는 구조라 별도 화면 문구 수정 불필요했음(확인 완료).
- **부분 포인트 사용 제약(신규 정책)**: Polar 상품은 고정가라 체크아웃 단위 할인이 불가 —
  `createCharge`가 `0 < 결제액 < 정가`인 부분 사용 케이스를 명시적으로 거부(과금 오류 방지,
  침묵 처리 아님). 전액 포인트 커버(결제액=0)는 기존대로 무료 통과. 이 정책은
  `NEEDS_FROM_OWNER.md`의 "결정 대기" 섹션에도 별도 항목으로 기록.
- 상품 카탈로그: 6개 `POLAR_PRODUCT_ID_*` 환경변수 + `web/tools/polar-setup.ts`(오너가 실 토큰
  받으면 1회 실행 → 상품 6개 자동 생성 + env 라인 출력).
- 테스트: `payment-polar.test.ts` 26개(전체 라이프사이클·이중 웹훅 전달 1회 정산·만료 스윕·
  대시보드 환불·**나쁜 서명 거부·오래된 타임스탬프 거부**(Stripe 스위트엔 없던 신규 케이스)),
  `pricing.test.ts` 가격 개정 반영.
- 북키핑: `NEEDS_FROM_OWNER.md`(Polar 신규 🔴 항목 + Stripe를 🟤 휴면으로 보존, 범례 추가),
  `LAUNCH_CHECKLIST.md`(동일 취지 영문 갱신).

## 검증 (직접 재확인)

- `pnpm typecheck` 클린.
- 서명검증 코드(`polar-webhook.ts`) 직접 리뷰 — 헤더 3종 확인·타임스탬프 독립 검증·시크릿
  디코딩·서명 포맷·길이 사전체크 후 `timingSafeEqual` 전부 스펙대로 정확히 구현됨을 확인.
- 부분포인트 거부 로직(`payment-polar.ts:106`) 직접 확인 — 침묵 처리 아니고 명확한 에러 throw.
- `pnpm test` **208 passed, 37 skipped**(Supabase 통합 스위트). 휴면 Stripe 스위트도 그대로 그린.
- `pnpm build` 성공 — `/api/payments/polar/webhook`과 `/api/payments/stripe/webhook` 둘 다
  정상 등록(Polar 활성·Stripe 휴면 상태로 나란히 공존).

## 추가 — 오너 샌드박스 토큰 도착 후 실전환 검증 (P5-C)

오너가 발급받은 실 샌드박스 organization access token이 web/.env에 반영된 후 이어서 진행:

1. **상품 6개 실생성**: `pnpm exec tsx tools/polar-setup.ts` 실행 전 상품 생성 API 요청 스키마를
   Polar 공식 문서로 재검증(스크립트 자체에 "미검증" 주석이 있었음) — `recurring_interval: null`
   만으로 충분한지 확인 필요했으나, **실행 결과 스크립트 그대로 6개 상품 전부 1회 성공**(수정 불요).
   생성된 상품 하나를 GET으로 재조회해 이름·가격·통화까지 실제로 정확한지 확인 후 6개 상품ID를
   `web/.env`에 반영.
2. **웹훅 시크릿 포맷 불일치 발견 및 해소**: Polar 공식 문서를 WebFetch로 조회했을 때 예시 시크릿이
   `polar_whs_...` 형식으로 나와, 기존 구현이 가정한 Standard Webhooks 표준 `whsec_...` 형식과
   다른 것처럼 보여 순간 "심각한 버그일 수 있다"고 판단 — 실제로 웹훅 엔드포인트를 API로 생성해
   보니 **실 시크릿은 `whsec_...` 형식이 맞음**(문서의 예시가 오래되었거나 다른 종류의 시크릿).
   실 시크릿으로 `verifyPolarSignature()`를 직접 실행해 실서명 검증 성공까지 확인 — 가짜 경보였음.
   부수적으로 이 실 시크릿의 base64 부분이 패딩 없는 43자였는데, Python의 엄격한 디코더는 이를
   거부하지만 실제 런타임인 Node의 `Buffer.from(str,'base64')`는 관대하게 정확히 32바이트로
   디코드함을 별도로 확인(진짜 버그 아님, 두 언어 디코더 차이).
3. **웹훅 엔드포인트 등록**: 처음 예시 URL(example.com)로 생성 후, 이 프로젝트의 실제 Vercel
   프로덕션 URL(`https://dotori-web.vercel.app` — curl로 실제로 Dotori 앱이 서빙되는 것 확인,
   오너의 다른 프로젝트 도메인 `dotorijumpang.com`은 한국판 `saju-web` 소유라 혼동하지 않도록
   별도 확인)로 PATCH 갱신. `order.paid`/`checkout.expired`/`order.refunded` 3개 이벤트 구독.
4. **로컬 웹훅 핸들러 실검증(터널 없이)**: 앱의 실제 코드 경로(`getPayment().createCharge()`)로
   실 주문 + 실 Polar 체크아웃 세션 생성 → `PolarPaymentProvider` 정상 선택 확인 →
   실 시크릿으로 서명한 `order.paid` 페이로드를 로컬 dev 서버의 웹훅 라우트에 POST →
   **`confirm()`이 Polar 실 API로 재조회해 "결제 미완료"를 정확히 감지하고 크레딧 지급을 거부**
   (웹훅이 "결제완료"라고 주장해도 우리 쪽이 독립적으로 재검증한다는 방어 로직이 실제로 작동함을
   증명 — 브라우저로 결제를 완료하지 않았으니 당연한 결과지만, 검증 로직 자체가 실제로 그렇게
   동작함을 확인한 것이 핵심). 이어서 `checkout.expired` 페이로드도 실서명으로 전송 →
   해당 주문이 실제로 `canceled` 상태로 전이됨을 Supabase에서 직접 확인.
5. **미완료 항목 — 브라우저 자동화 도구 부재**: "Polar 샌드박스 테스트카드(4242...)로 실제 결제
   완료 → 정산·크레딧 지급 확인 → 환불 API 호출 → 회수 확인"은 Polar 호스팅 체크아웃 페이지에
   실제로 접속해 폼을 채우는 브라우저 상호작용이 필요(Polar 문서 확인 결과 API로 결제를 강제
   완료시키는 방법은 없음, 오직 브라우저+테스트카드 뿐). 이번 세션엔 범용 헤드리스 브라우저 도구가
   없어 이 마지막 구간(실 결제 완료 + 실 환불)은 완료하지 못함 — 오너가 직접 위 체크아웃 URL로
   테스트카드 결제를 1회 완료하거나, 브라우저 자동화 도구가 있는 세션에서 이어서 진행 필요.
6. 테스트용으로 만든 주문·유저 데이터는 전부 타겟 삭제로 정리(잔존 없음). 이번 라운드는 코드
   변경 없음 — `.env`에 실 자격증명·상품ID·웹훅시크릿만 반영, `pnpm typecheck`/`test`(208 passed,
   37 skipped)/`build` 전부 재확인 그린.

## 남은 항목

- ✅ ~~오너가 Polar 가입 + 샌드박스 토큰 발급~~ — 2026-07-12 완료·검증됨(조직 "dotori" 확인).
- ✅ ~~상품 6개 생성~~ — 완료, 실 API로 재조회해 이름·가격 확인 완료.
- ✅ ~~웹훅 엔드포인트 등록~~ — 완료, 프로덕션 URL로 설정, 3개 이벤트 구독, 실 서명검증 로컬
  테스트 통과.
- 🔴 **브라우저로 실제 테스트카드 결제 완료 + 정산·크레딧 지급 확인 + 환불 API 호출 + 회수
  확인** — 이 세션엔 브라우저 자동화 도구가 없어 미완료. 오너가 직접 체크아웃 URL에서 테스트카드
  (`4242 4242 4242 4242`, 임의 미래 만료일·CVC)로 1회 결제 완료하거나, 브라우저 자동화 가능한
  세션에서 이어서 진행 필요.
- ⏳ Polar 실계정 심사 제출(소셜 프로필 + 플로우 데모, 위 브라우저 결제 검증 완료 후 진행), 프로덕션
  토큰(런치 시점).
- 부분 포인트 사용 제약에 대한 UI 처리(Polar 활성화 시 체크아웃 화면에서 부분 포인트 입력을
  막을지 여부) — 현재는 런타임 영향 없음(Polar 미설정 아님, 이제 활성 상태이므로 재검토 시점이
  된 것으로 판단 — 다음 항목에서 team-lead에게 별도 보고).
