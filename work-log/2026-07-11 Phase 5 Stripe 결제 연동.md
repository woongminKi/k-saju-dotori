# Phase 5 — Stripe 결제 연동

## 배경

Phase 4까지는 `StubPaymentProvider`(즉시 승인, 개발용)로 결제 플로우를 검증. Phase 5는 실 PG인
Stripe를 붙이는 작업 — 한국판 `payment-kakao.ts`가 유일한 실 PG 어댑터 참고 구조였으나, KakaoPay는
ready/approve/cancel/주문조회 API를 직접 호출하는 구조인 반면 Stripe는 Checkout Session(호스팅
결제 페이지) + 웹훅 기반 비동기 확정이 표준 방식이라 아키텍처를 새로 설계함.

## 설계

- `createCharge`: Stripe Checkout Session 생성(`mode: payment`, 단일 `price_data` 라인아이템,
  상품명 영문 `Reading Credit ×N`/`Oracle Credit ×N`). 포인트로 전액 충당(charge=0)되는 경우는
  Stripe를 아예 호출하지 않고 기존 `/api/checkout/approve` 경로로 즉시 정산(KakaoPay의 0원 분기와
  동일 패턴). `client_reference_id` + `metadata.orderId` 이중으로 주문 식별자를 세션에 심어둠.
- `confirm(orderId, pgToken?)`: **두 곳에서 호출되어도 안전한 멱등 설계** — (1) 기존 approve
  라우트가 Stripe의 `success_url={CHECKOUT_SESSION_ID}` 리다이렉트로 호출, (2) 신규 웹훅 라우트가
  `checkout.session.completed` 이벤트로 호출. 세션 조회 후 `payment_status==='paid'` +
  `amount_total`이 기대 금액과 일치하는지 이중 확인. 저장된 `order.pgToken`(세션ID)을 호출자가 준
  토큰보다 우선 신뢰(콜백 파라미터 위조 방어). 어느 쪽이 먼저 오든 `markOrderPaid` 원자 전이가
  승자 하나만 크레딧 지급하도록 보장(기존 Stub/Kakao와 동일 계약).
- `refund`: 회수가능성(`assertRefundReclaimable`) 먼저 검증 → Stripe `payment_intent` 환불 →
  `markOrderRefunded` 원자 전이 → 크레딧/포인트 회수. 포인트 전액결제 주문은 Stripe 호출 없이
  스토어 회수만 수행.
- `reconcilePending`: approve 리다이렉트 유실 시 정합성 복구 — pending+세션ID 있는 오래된 주문을
  훑어 Stripe 세션 상태로 확정(complete+paid)/취소(expired)/보류(open) 처리.
- 신규 웹훅 라우트 `app/api/webhooks/stripe/route.ts`: raw body(`req.text()`, `req.json()` 금지 —
  서명은 원본 바이트 기준)로 `stripe.webhooks.constructEvent` 서명 검증, 실패 시 400. 성공 시
  `checkout.session.completed`/`checkout.session.async_payment_succeeded` 이벤트에서 주문ID
  추출 후 `getPayment().confirm()` 재사용(정산 로직 중복 없음). Node 런타임 명시.
- `services.ts`: `stripeConfigured()`(둘 다 있거나 둘 다 없거나, 반쪽 설정은 즉시 throw — 기존
  `useSupabase()`와 동일 패턴)로 `StripePaymentProvider`/`StubPaymentProvider` 선택.
- `reconcile` 라우트에 `instanceof StripePaymentProvider` 분기 추가.
- 신규 의존성 `stripe`(^22, 사전 승인됨) 1건만 추가. `.env.example`의 기존 Stripe 3종 변수
  주석 해제.

## 검증

- `pnpm typecheck`: 0 에러(Stripe 22.3.1 실타입 기준).
- `pnpm test`: **159 passed, 37 skipped**(스킵은 기존 Supabase 통합 스위트 — 이번 세션엔
  `SUPABASE_TEST_URL` 미설정). 신규 `payment-stripe.test.ts` 15개 전부 통과(Stripe SDK 모킹 —
  금액 계산·0원 분기·멱등 가드 등 실 API 호출 없이 검증 가능한 부분).
- `pnpm build`: 성공, `/api/webhooks/stripe`·`/api/payments/reconcile` 정상 라우트 등록,
  기존 39개 라우트 전부 무손상.
- 한글 문자열 없음(제품명·에러 메시지·주석 전부 영문) 확인.

## 남은 항목

- 🔴 **Stripe 테스트 키가 아직 없어 실제 체크아웃·웹훅 서명검증·환불은 미검증**(코드는 작성·
  타입체크·빌드 전부 통과, 두 파일 상단에 `TODO(needs-owner-creds)` 마킹). 키 도착 시:
  1. 실 테스트 모드로 `/checkout` → Stripe 호스팅 페이지 → 결제 → `success_url` 리다이렉트로
     `/api/checkout/approve`가 정산되는지, 2. Stripe 대시보드에서 웹훅 엔드포인트
     (`/api/webhooks/stripe`) 등록 후 실 이벤트로 서명검증·중복호출(웹훅+리다이렉트 둘 다) 시
     한 번만 크레딧 지급되는지, 3. 환불 API로 실 `payment_intent` 환불까지 확인 필요.
- `NEEDS_FROM_OWNER.md`에서 Stripe 테스트 키 상태를 🔴로 격상.
- Stripe 라이브 키(Phase 7 런치 시점)는 별도.
