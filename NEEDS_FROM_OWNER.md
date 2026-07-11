# 사용자(오너) 제공 필요 항목

> 이 파일은 진행 중 계속 갱신됩니다. ✅ = 해결됨, ⏳ = 아직 필요 없음(도달 시 요청), 🔴 = 지금 블로킹.

| 상태 | 항목 | 용도 | 필요 시점 | 제공 방법 |
|---|---|---|---|---|
| ✅ | Anthropic API 키 | LLM 리딩 생성·이밸 | Phase 2 | 한국판 키 재사용 결정(2026-07-11). 로컬 .env로만 사용, 커밋 금지 |
| ✅ | Supabase service_role 키 | 서버 DB 접근(RLS deny-all 우회) | Phase 3 검증 | 2026-07-11 정상 키 수령·web/.env 반영·인증 200 확인 완료 |
| ✅ | 마이그레이션 SQL 실행 | DB 테이블 생성 | — | 2026-07-11 사용자가 SQL Editor에서 실행 완료. 테이블 9종 생성·RLS deny-all(service 삽입→anon 차단) 실검증 통과 |
| ✅ | Google Cloud OAuth 클라이언트 | Google 로그인 | Phase 3 검증 | 사용자가 Supabase 대시보드에 직접 설정 완료(2026-07-11). 로그인 라운드트립 테스트에서 최종 확인 예정 |
| ✅ | Vercel 신규 프로젝트 | 프리뷰 배포 | Phase 4 | 2026-07-11 완료: `dotori-web`(팀 woongmins-projects) 생성, Root Directory=`web`+sourceFilesOutsideRootDirectory로 `@engine` 참조 정상 빌드 확인, GitHub(`woongminKi/k-saju-dotori`) 연결 완료. 프리뷰 배포·solo+oracle E2E 스모크 테스트 통과(Phase 4 리포트 참고). ⚠️ Supabase 미설정 상태라 이 프리뷰는 InMemoryStore(무상태)로 동작 — 지갑/캐시가 요청 간 유지 안 됨(서버리스 인스턴스 비고정). 위 service_role 키 정정 후 실제 영속 스토어로 전환 필요 |
| ⏳ | Stripe 계정 + 테스트 키 | 결제 | Phase 5 | stripe.com 가입 → 테스트 모드 Secret key + 웹훅 서명 시크릿 |
| ⏳ | Stripe 라이브 키 | 실결제 | Phase 7 런치 | 심사/활성화 후 라이브 키 |
| ⏳ | 법인/사업자 정보 + 서포트 이메일 | Terms·Privacy·Stripe 프로필 | Phase 7 | 상호(개인/법인), 소재 국가, 연락 이메일 |
| ⏳ | 도메인 | 프로덕션 URL | Phase 7 | 예: dotori.app 등 구매 여부 결정 |

## 결정 대기 (돈 안 드는 것)

- 오라클 크레딧 팩 최종 구성: 현재 시작안 5/12/30개 = $0.99/$1.99/$2.99, 리딩 1/3/5장 = $4.99/$11.99/$17.99 — Phase 5 전까지 확정하면 됨
- Phase 2 완료 시 영어 리딩 톤 리뷰 (트랜스크립트 발췌 보여드림)
