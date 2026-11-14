# Knowly 중심 냥대리 통합

`main`의 Knowly 인증·권한·검색·문서·FAQ·대화·평가 API를 유지하고 `nyang-fronted`와 후속 통합 브랜치의 냥대리 화면을 루트 앱으로 사용합니다. 기존 `feat/nyang-main-integration`의 화면 연결을 재사용하되 공용 직원/관리자 계정으로 대신 로그인하는 방식은 통합 앱에서 사용하지 않습니다.

## 기능 연결

| 화면 | 실제 연결 및 저장 |
| --- | --- |
| 직원·담당자 로그인 | 기존 Knowly Auth 개인 계정, `profiles.role` 확인 |
| 물어보기 | 기존 `chat` Edge Function, 연속 대화 ID, FAQ/RAG/LLM 결과와 출처·평가 |
| 사진·PDF·엑셀·텍스트 첨부 | main의 첨부 처리 코드, 최대 3개, 기존 개인정보 정책 유지 |
| 사내 문서·출처 | main의 문서 목록·원문 PDF/엑셀·청크 이동 |
| 미답변·통계·FAQ·문서·사용자·모델 설정 | main의 실제 관리자 화면을 같은 출처의 iframe에 표시 |
| 서버 대화 기록 | main의 대화 화면; 기존 대화와 새 질문은 Supabase에서 본인만 조회 |
| 대화 폴더·제목·저장 답변·내 일정 | 원래 냥대리 기능, 계정 UUID로 구분한 브라우저 저장 |
| 질문 게시판·답변·삭제/복원·좋아요 | 새 `nyang` Edge Function과 PostgreSQL 비공개 `nyang` 스키마 |
| 출석·질문 경험치·포인트·츄르·하트·꾸미기·쓰다듬기 | 기존 냥대리 보상 규칙, 개인 계정별 서버 저장 |
| 고양이 성격·표정·배경·다크 모드·움직임 설정 | 원래 냥대리 화면/상호작용 유지 |

질문 예시 버튼도 실제 Knowly에 질문합니다. 검색 실패나 근거 부족을 샘플 FAQ 답변으로 바꾸지 않습니다. 분야 선택은 화면 분류이며 Knowly 검색은 기존처럼 등록된 전체 문서/FAQ를 대상으로 합니다. 일정은 브라우저 계획 도구이며 기존 샘플 일정 규칙을 사용하므로 회사 규정의 자동 승인이나 외부 캘린더 연동이 아닙니다.

## 실행·배포

저장소 **루트**에서 실행합니다. `nyang-frontend/`는 원본 UI와 이전 독립 프로토타입의 보존본이며, 그 디렉터리의 Worker/D1 배포는 통합 앱 배포 경로가 아닙니다.

```sh
npm ci
# .env.example → .env.local: 기존 VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
npm test
npm run dev
npm run build
```

`prepare:nyang`가 원본 UI 자산을 `public/nyang/`에 준비하고, `build:nyang-embed`가 main의 화면·첨부 모듈을 `public/knowly/`에 빌드합니다. 생성물은 커밋하지 않습니다. 최종 `dist/`는 기존 Vercel 정적 배포 대상입니다. `/docs/*`, `/admin/*` 링크도 Knowly 화면으로 이어집니다.

운영 반영 전 **마이그레이션과 `nyang` Edge Function을 먼저 배포**해야 합니다. 기존 저장소의 main 배포 워크플로가 이를 지원합니다. 새 프론트엔드만 먼저 배포하면 활동 데이터 호출이 실패합니다.

```sh
supabase db push --linked --dry-run
supabase db push --linked
supabase functions deploy nyang --project-ref <project-ref>
```

새 함수는 기존 함수와 같은 `getCaller`로 JWT와 프로필을 검증합니다. 서버의 `SUPABASE_DB_URL`을 사용하며, 별도의 D1·데모 비밀번호·공용 Knowly 직원/관리자 비밀번호가 필요하지 않습니다. DB 연결은 [Supabase 공식 Edge Function/Postgres 안내](https://supabase.com/docs/guides/functions/connect-to-postgres)를 따릅니다. DB URL은 브라우저에 전달하지 않습니다.

기존 D1 데모 계정의 보상을 실제 직원에게 자동 이관하지 않습니다. 기존 Knowly 테이블·RLS·검색 함수·문서 저장소는 변경하지 않습니다. 새 스키마는 anon/authenticated의 직접 접근을 차단하고 인증된 서버 함수에서만 접근합니다. 보상/한도 검사는 트랜잭션과 잠금으로 직렬화합니다. 사내 소규모 사용을 위한 방식이며 사용량이 늘면 잠금 분할을 검토해야 합니다.

공통 보상 규칙을 수정하면 `npm run sync:nyang-server`로 Edge Function용 모듈도 갱신하고 `npm test`를 실행하세요.

## 검증 및 운영 확인

자동 검증: main 검색 테스트, 개인 로그인/역할 확인·첨부·연속 대화·평가 전송 테스트, 냥대리 회귀 테스트, 실제 PostgreSQL 엔진(PGlite)에서 마이그레이션·보상·중복 요청·계정 격리·게시판 권한·직접 DB 접근 차단 테스트.

브라우저 확인은 로컬 서버 접근 시간 초과 및 Windows 컴퓨터 사용 도구의 URL 판별 실패로 완료하지 못했습니다. 실제 Supabase 로그인·LLM·원문 파일 요청도 운영 자격 증명 없이 검증하지 않았습니다. 배포 후 아래를 확인하세요.

1. 서로 다른 직원 계정으로 로그인해 대화/보상이 분리되는지 확인합니다.
2. 질문 예시·자유 질문·근거 없는 질문·첨부 질문을 보내고, 실패 시 샘플 답변으로 바뀌지 않는지 확인합니다.
3. 출처 원문, 피드백, 서버 대화 기록, 새 대화와 이어 질문을 확인합니다.
4. 일정·폴더·출석·쓰다듬기·츄르·꾸미기·게시판과 담당자 답변/복원을 확인합니다.
5. 담당자 계정으로 기존 6개 관리자 화면을 확인하고 직원 계정의 관리자 접근이 차단되는지 확인합니다.
