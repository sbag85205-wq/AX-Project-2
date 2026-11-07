# AX-Project-2 · Knowly

사내 문서를 근거로 답하는 업무 도우미 챗봇입니다. 천안 AX 액션러닝 2조 프로젝트예요.

- **프론트엔드**: React + TypeScript + Vite → Vercel 배포
- **백엔드**: Supabase (Postgres + pgvector, Auth, Storage, Edge Functions)
- **답변 생성**: FAQ 매칭 → 문서 검색(RAG) → OpenRouter LLM 요약 → 출처 검증

> ⚠ Supabase·Vercel·OpenRouter는 외부 클라우드예요. 기업 인터뷰에서 "실제 문서와 질문은 외부로 보내면 안 된다"고 했으므로,
> 이 배포본에는 **가상 문서만** 올려서 시연해 주세요. 사내 운영 전환 방법은 아래 [사내 서버로 옮길 때](#사내-서버로-옮길-때)를 참고하세요.

## 기능

| 화면 | 경로 | 내용 |
|---|---|---|
| 로그인 | `/` | 관리자가 발급한 아이디·비밀번호로 로그인 (회원가입 없음) |
| 직원 챗봇 | `/` | 대화형 질문, **사진·PDF·엑셀·텍스트 첨부(최대 3개, 붙여넣기·끌어다 놓기)**, 요약·절차·주의사항·상세 설명, 문서명·버전·페이지 출처, 원문 보기, 도움 됨/안 됨, 내 대화 기록 |
| 미등록 질문 | `/admin/unanswered` | 근거를 못 찾았거나 '도움 안 됨'을 받은 질문을 비슷한 것끼리 묶어 보여주고, 바로 FAQ로 등록 |
| 이용 통계 | `/admin/stats` | 질문 수, 이용 직원 수, 성공률, 응답 시간, 만족도, 부서별·카테고리별·모델별 집계, CSV |
| 문서 관리 | `/admin/documents` | PDF·엑셀(XLSX·XLS·CSV)·TXT 업로드 → 브라우저에서 페이지(엑셀은 시트)별 추출 → 청크·(임베딩) → 검색 활성화 |
| 문서 보기 | `/docs`, `/docs/:id` | 텍스트 보기와 원본 보기 (PDF는 앱 안에서 페이지로, 엑셀은 시트별 표로) |
| FAQ 관리 | `/admin/faqs` | FAQ 추가·수정·숨김·삭제 |
| 사용자 관리 | `/admin/users` | 계정 발급, 부서·권한 변경, 비밀번호 재설정 |

**개인정보 원칙** (기업 인터뷰 반영)
- 질문 원문과 대화는 **본인만** 볼 수 있어요 (RLS로 관리자도 조회 불가).
- 미등록 질문은 이름·아이디 없이 질문 문장만 익명으로 모아요.
- 관리자 통계는 원문 없는 집계 함수(`admin_usage_stats`)로만 조회해요.
- 질문에 첨부한 파일·사진은 **저장하지 않아요**. 그 답변을 만들 때만 쓰고, 대화에는 파일 이름과 읽었는지만 남아요.
  다만 답변을 만들 때 외부 모델(OpenRouter)로 보내지므로 실제 사내 자료는 첨부하지 마세요. 사진 속 주민번호·카드번호 등은 판독할 때 가리도록 지시해요.

> 설계서는 초기 입력을 'PDF와 UTF-8 텍스트'로 정했지만, 팀 요청으로 엑셀 문서 등록과 질문 첨부를 추가했어요 (2026-11-07).

## 폴더 구조

```
src/                      React 앱
  pages/Chat.tsx          직원 챗봇
  pages/admin/*           관리자 화면
  lib/extract.ts          PDF 페이지별·엑셀 시트별 텍스트 추출 (pdf.js, SheetJS)
  lib/attach.ts           질문 첨부 준비 (파일 글자 추출, 사진 줄이기)
supabase/
  migrations/             DB 스키마, RLS, 검색·통계 함수
  seed.sql                가상 문서·FAQ·예시 미등록 질문
  functions/chat          질문 처리 (검색 → LLM → 출처 검증 → 저장·집계)
  functions/ingest        문서 청크 분할·임베딩
  functions/admin-users   계정 발급·삭제·비밀번호 재설정
  functions/_shared       검색어 추출, 청크 분할, 프롬프트, 모델 어댑터
tests/                    검색·청크·출력 검증 단위 테스트
```

## 처음 설정하기

### 1. Supabase DB 만들기

[Supabase 대시보드](https://supabase.com/dashboard) → 프로젝트 → **SQL Editor**에서 순서대로 실행해요.

1. `supabase/migrations/20261031000000_init.sql` 전체 붙여넣고 실행
2. `supabase/seed.sql` 실행 (가상 문서 4개, FAQ 3개, 예시 미등록 질문)

CLI를 쓴다면:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

### 2. 회원가입 막기

**Authentication → Sign In / Providers → Email**에서 **Allow new users to sign up**을 끕니다.
(계정은 관리자 화면에서만 발급해요.)

### 3. 첫 관리자 계정

1. **Authentication → Users → Add user → Create new user**
   - Email: `admin@knowly.local` (로그인 아이디는 `@` 앞부분인 `admin`)
   - Password: 8자 이상, **Auto Confirm User** 체크
2. SQL Editor에서 관리자 권한 부여:
   ```sql
   update public.profiles set role = 'admin', display_name = '관리자' where login_id = 'admin';
   ```

이후 직원 계정은 사이트의 **관리자 → 사용자 관리**에서 만들면 돼요.

### 4. Edge Functions 배포와 비밀값

```bash
npx supabase functions deploy chat
npx supabase functions deploy ingest
npx supabase functions deploy admin-users

# LLM (없으면 '검색 전용' 모드로 문서 내용을 그대로 보여줘요)
npx supabase secrets set LLM_API_KEY=<OpenRouter 키> LLM_MODEL=openai/gpt-6-luna
```

| 비밀값 | 기본값 | 설명 |
|---|---|---|
| `LLM_API_KEY` | (없음) | OpenRouter API 키. 없으면 검색 전용 모드 |
| `LLM_BASE_URL` | `https://openrouter.ai/api/v1` | OpenAI 호환 API 주소 |
| `LLM_MODEL` | `openai/gpt-6-luna` | 모델 ID. 관리자 → 설정에서 고른 모델이 있으면 그것이 우선이에요 (2026-11-07 운영 모델을 Qwen에서 Luna로 변경) |
| `LLM_TEMPERATURE` / `LLM_MAX_TOKENS` | `0.2` / `2000` | 추론 설정. 추론형 모델은 생각하는 토큰도 `LLM_MAX_TOKENS`에 들어가므로 700처럼 작게 두면 답이 잘려요 |
| `LLM_REASONING_EFFORT` | `low` | OpenRouter 추론 강도 (`low`·`medium`·`high`, `off`면 보내지 않음). 생각 과정은 응답에서 빼요 |
| `EMBEDDING_MODEL` | (없음) | 지정하면 벡터 검색을 함께 사용. 없으면 키워드 검색만 |
| `EMBEDDING_BASE_URL` / `EMBEDDING_API_KEY` | LLM 값 사용 | 임베딩 API 주소·키 |
| `VISION_MODEL` | OpenRouter 사용 시 `google/gemini-2.5-flash-lite` | 질문에 첨부한 사진을 읽는 모델. OpenRouter가 아니고 지정도 없으면 사진은 읽지 않아요 |
| `ALLOWED_ORIGIN` | `*` | CORS 허용 출처. 배포 후 Vercel 주소로 좁히세요 |

> API 키는 Supabase secret에만 넣고, 저장소나 프론트엔드 환경변수에는 넣지 마세요.
> 임베딩 모델을 바꾸면 기존 문서를 지우고 다시 등록해야 벡터 검색에 포함돼요.

### 5. 로컬 실행

```bash
cp .env.example .env.local   # VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY 입력
npm install
npm run dev                  # http://localhost:5173
npm test                     # 단위 테스트
npm run build                # 타입 검사 + 빌드
```

### 6. Vercel 배포

1. [Vercel](https://vercel.com/new) → **Import Git Repository** → `AX-Project-2`
2. Framework Preset: **Vite** (자동 인식), Root Directory: 그대로
3. Environment Variables:
   - `VITE_SUPABASE_URL` = `https://<project-ref>.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_...`
4. Deploy. `vercel.json`이 새로고침 시 404가 나지 않도록 모든 경로를 `index.html`로 보내요.

## 답변이 만들어지는 순서

1. 로그인 토큰으로 사용자·부서 확인, 질문 길이 검사 (2,000자)
2. 질문을 세 모양으로 준비: 원래 질문 / 부연 설명을 뺀 실제 질문 문장 / AI가 인사·배경·높임말을 걷고 규정 용어로 정리한 질문
   (15자 미만 질문은 AI 정리를 건너뛰고, 실패해도 나머지로 진행). 검색어를 뽑을 때 높임·격식 어미(-시-, -습니까, -주시겠어요 등)는 뗀다
   → 핵심 검색어끼리 비교해 등록된 FAQ와 같은 질문이면 FAQ 답변 반환
3. 문서 청크 검색: 한국어 바이그램 키워드 점수 (+ 임베딩이 있으면 코사인 유사도)로 후보 8개를 뽑고,
   키워드 점수를 "맞은 검색어 ÷ min(검색어 수, 6)"으로 보정해 다시 정렬한 뒤 기준을 넘은 앞의 5개를 근거로 써요
   (관리자 → 설정의 검색 미리보기도 같은 규칙. 구어체 어미 조각은 검색어에서 빼요)
4. 근거가 기준 미달이면 **답하지 않고** "등록된 답변 없음" → 미등록 질문으로 익명 수집.
   문서는 찾았지만 질문에 딱 맞는 기준이 없으면 "딱 맞는 기준 없음"으로 가장 가까운 내용과 관련 출처를 보여 줌.
   문서 숫자로 바로 계산되는 질문(주 2일 → 한 달 기준)은 계산 과정과 "문서에 직접 기준은 없음"을 밝혀 답함
5. 근거 조각에 `[S1]` 같은 ID를 붙여 LLM에 전달, JSON 형식으로 요약·절차·주의사항·출처 ID를 받음
6. 서버가 JSON 형식과 출처 ID를 검사 (허용 목록 밖 ID는 버림, 형식 오류는 1회 재요청)
7. 대화 저장(본인만 열람), 통계 이벤트 저장(원문 없음)

## 사내 서버로 옮길 때

모델 호출은 OpenAI 호환 API만 쓰기 때문에 주소와 모델만 바꾸면 돼요.

```bash
# 예: 사내 Ollama
LLM_BASE_URL=http://<내부 서버>:11434/v1
LLM_MODEL=qwen3:1.7b
LLM_API_KEY=            # 비워 둠
EMBEDDING_BASE_URL=http://<내부 서버>:11434/v1
EMBEDDING_MODEL=bge-m3
```

Supabase도 self-hosting이 가능하지만, 기존 사내 PostgreSQL을 쓰려면 `supabase/migrations`의 스키마와
`supabase/functions`의 로직을 사내 백엔드로 옮겨야 해요. 같은 설정이라도 하드웨어·양자화에 따라 품질과 속도가
달라질 수 있으니, 가상 평가 질문으로 다시 검증해 주세요.

## 참고 자료

- `Knowly_개발설계서_v1.docx`: 요구사항 F01–F07, API·DB 설계
- FAQ 챗봇 관리자 대시보드 프로토타입: 미등록 질문 화면과 직원 챗봇 피드백 흐름
- 노션 `AX 기업 과제 프로젝트 2조`: 기업 인터뷰, 기술 멘토링, 발표 피드백

## 자동 배포 (GitHub Actions)

GitHub에 push하면 자동으로 배포돼요. 별도 명령은 필요 없어요.

| push한 브랜치 | 배포되는 곳 |
|---|---|
| `main` | 냥대리 디자인 https://cheonax-n.duckdns.org (Vercel `knowly-nyang`) |
| `main`의 `supabase/` 변경 | DB 변경(migration) + Edge Function |

- 기존 디자인 사이트 https://cheonax.duckdns.org (Vercel `knowly`)는 더 이상 자동 배포하지 않아요. 마지막 배포 상태 그대로 남아 있어요.
- 진행 상황과 실패 원인은 GitHub 저장소의 **Actions** 탭에서 볼 수 있어요.
- 단위 테스트가 실패하면 배포하지 않아요.
- 기능은 자기 브랜치에서 고치고, GitHub에서 PR을 만들어 `main`에 합치면 배포돼요.
- DB 변경은 되돌리기 어려워요. `supabase/migrations/`에 새 파일을 추가하기 전에 팀과 꼭 상의해 주세요.
- 저장소 비밀값 `VERCEL_TOKEN`, `SUPABASE_ACCESS_TOKEN`이 필요해요 (Settings → Secrets and variables → Actions).
