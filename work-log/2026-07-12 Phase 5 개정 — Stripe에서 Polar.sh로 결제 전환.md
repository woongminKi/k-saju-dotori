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

## 남은 항목

- 🔴 오너가 Polar 가입 + 샌드박스 organization access token + 웹훅 시크릿 발급(심사 불필요,
  즉시 가능) → 수령 후 `pnpm exec tsx tools/polar-setup.ts`(web/ 에서) 실행해 상품 6개 생성.
- ⏳ Polar 실계정 심사 제출(런치 전), 프로덕션 토큰(런치 시점).
- 부분 포인트 사용 제약에 대한 UI 처리(Polar 활성화 시 체크아웃 화면에서 부분 포인트 입력을
  막을지 여부) — 현재는 런타임 영향 없음(Polar 미설정), 실 전환 시점에 재검토.
