# 사용자(오너) 제공 필요 항목

> 이 파일은 진행 중 계속 갱신됩니다. ✅ = 해결됨, ⏳ = 아직 필요 없음(도달 시 요청), 🔴 = 지금 블로킹.

| 상태 | 항목 | 용도 | 필요 시점 | 제공 방법 |
|---|---|---|---|---|
| ✅ | Anthropic API 키 | LLM 리딩 생성·이밸 | Phase 2 | 한국판 키 재사용 결정(2026-07-11). 로컬 .env로만 사용, 커밋 금지 |
| 🔴 | **새 Supabase 프로젝트** | DB·인증 | Phase 3 검증 | supabase.com에서 새 프로젝트 생성 → Project URL, anon key, service_role key 3개 전달 (코드 작성은 키 없이 선진행 중 — 로그인/DB 검증만 블로킹) |
| 🔴 | **Google Cloud OAuth 클라이언트** | Google 로그인 | Phase 3 검증 | Google Cloud Console에서 OAuth 클라이언트 ID/Secret 생성 → Supabase 대시보드 Auth > Providers > Google에 입력. 리디렉트 URI는 Supabase가 알려주는 값 사용 |
| ⏳ | Vercel 신규 프로젝트 | 프리뷰 배포 | Phase 4 | K-saju 저장소를 GitHub에 올린 뒤 Vercel에서 import (web/ 루트). 원격 저장소 생성 여부도 이때 결정 |
| ⏳ | Stripe 계정 + 테스트 키 | 결제 | Phase 5 | stripe.com 가입 → 테스트 모드 Secret key + 웹훅 서명 시크릿 |
| ⏳ | Stripe 라이브 키 | 실결제 | Phase 7 런치 | 심사/활성화 후 라이브 키 |
| ⏳ | 법인/사업자 정보 + 서포트 이메일 | Terms·Privacy·Stripe 프로필 | Phase 7 | 상호(개인/법인), 소재 국가, 연락 이메일 |
| ⏳ | 도메인 | 프로덕션 URL | Phase 7 | 예: dotori.app 등 구매 여부 결정 |

## 결정 대기 (돈 안 드는 것)

- 오라클 크레딧 팩 최종 구성: 현재 시작안 5/12/30개 = $0.99/$1.99/$2.99, 리딩 1/3/5장 = $4.99/$11.99/$17.99 — Phase 5 전까지 확정하면 됨
- Phase 2 완료 시 영어 리딩 톤 리뷰 (트랜스크립트 발췌 보여드림)
