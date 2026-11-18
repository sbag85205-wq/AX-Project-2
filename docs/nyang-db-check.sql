-- 냥대리 DB 점검(읽기만 함, 아무것도 바꾸지 않음). Supabase 대시보드 → SQL Editor에 붙여 넣고 실행한다.
-- 결과의 '문제 수'가 모두 0이면 정상. 0이 아닌 줄은 '예시'에 해당 계정(로그인 아이디)이 몇 개 나온다.
WITH
ids AS (SELECT p.id::text AS uid, p.login_id, p.role FROM public.profiles p),
checks AS (
  -- 1) 냥대리 계정 정보는 있는데 Knowly 계정이 없음(지워진 계정의 기록)
  SELECT 1 AS no, '지워진 Knowly 계정의 냥대리 기록' AS 항목, m.uid AS 대상 FROM nyang.members m LEFT JOIN ids ON ids.uid = m.uid WHERE m.uid IS NOT NULL AND ids.uid IS NULL
  UNION ALL
  -- 2) 지갑이 없는 계정 / 계정 정보 없는 지갑
  SELECT 2, '지갑이 없는 냥대리 계정', m.uid FROM nyang.members m LEFT JOIN nyang.wallets w ON w.uid = m.uid WHERE m.uid IS NOT NULL AND w.uid IS NULL
  UNION ALL
  SELECT 3, '주인 없는 지갑', w.uid FROM nyang.wallets w LEFT JOIN nyang.members m ON m.uid = w.uid WHERE m.uid IS NULL
  UNION ALL
  -- 4) 지갑 내용이 깨졌거나 포인트·하트가 음수
  SELECT 4, '지갑 내용 이상(음수·형식)', w.uid FROM nyang.wallets w
   WHERE w.data !~ '^\s*\{' OR COALESCE((w.data::jsonb->>'points')::numeric, 0) < 0 OR COALESCE((w.data::jsonb->>'hearts')::numeric, 0) < 0
  UNION ALL
  -- 5) 레벨(질문 수)이 실제 질문 기록 수와 다름
  SELECT 5, '레벨(질문 수)과 질문 기록 수가 다름', w.uid FROM nyang.wallets w
   WHERE COALESCE((w.data::jsonb->>'questions')::int, 0) <> (SELECT COUNT(*) FROM nyang.questions q WHERE q.uid = w.uid)
  UNION ALL
  -- 6) 담당자/직원 구분이 Knowly 계정과 다름
  SELECT 6, '역할이 Knowly 계정과 다름', m.uid FROM nyang.members m JOIN ids ON ids.uid = m.uid
   WHERE (ids.role = 'admin') <> (m.role = 'staff')
  UNION ALL
  -- 7) 하루 질문 보상 한도(20개) 초과
  SELECT 7, '하루 질문 보상 20개 초과', q.uid || ' ' || q.day FROM nyang.questions q GROUP BY q.uid, q.day HAVING COUNT(*) > 20
  UNION ALL
  -- 8) 자기 글에 누른 유익해요
  SELECT 8, '자기 글에 누른 유익해요', l.uid FROM nyang.likes l JOIN nyang.posts p ON p.id = l.post WHERE p.author = l.uid
  UNION ALL
  -- 9) 같은 브라우저 기록 올리기가 두 번 이상(지갑이 두 번 더해졌을 수 있음)
  SELECT 9, '같은 브라우저 기록을 두 번 올림', o.uid || ' ' || o.id FROM nyang.operations o WHERE o.kind = 'import' GROUP BY o.uid, o.id HAVING COUNT(*) > 1
  UNION ALL
  -- 10) 개인 기록(내 일정·대화 기록 등) 이름·형식 이상
  -- (냥대리 관리 목록·그림은 계정이 아닌 '__nyang_catalog__' 번호로 같은 표에 있다: 개인 기록 검사에서 뺀다)
  SELECT 10, '개인 기록 이름이 허용 목록에 없음', s.uid || ' ' || s.key FROM nyang.user_state s
   WHERE s.uid <> '__nyang_catalog__' AND s.key !~ '^(om-tasks|om-question-history|om-seen-replies|om-chat-sessions|om-chat-active|om-docs|om-personality|om-cat-motion|nyang-color-theme|om-bg-(theme|uploads)-[a-z]{1,12})$'
  UNION ALL
  SELECT 11, '개인 기록이 목록이어야 하는데 아님', s.uid || ' ' || s.key FROM nyang.user_state s
   WHERE s.uid <> '__nyang_catalog__' AND s.key IN ('om-tasks', 'om-question-history', 'om-chat-sessions', 'om-docs') AND left(ltrim(s.value), 1) <> '['
  UNION ALL
  SELECT 12, '개인 기록 크기 8MB 초과', s.uid || ' ' || s.key FROM nyang.user_state s WHERE length(s.value) > 8000000
  UNION ALL
  -- 13) 브라우저에서 nyang 표를 직접 읽을 수 있음(있으면 안 됨)
  SELECT 13, 'anon·authenticated가 nyang 표에 접근 가능', c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'nyang' AND c.relkind = 'r' AND (has_table_privilege('anon', c.oid, 'SELECT') OR has_table_privilege('authenticated', c.oid, 'SELECT'))
)
SELECT n.no, n.항목, COUNT(c.대상) AS 문제수,
  string_agg(DISTINCT COALESCE((SELECT login_id FROM ids WHERE ids.uid = split_part(c.대상, ' ', 1)), c.대상), ', ') FILTER (WHERE c.대상 IS NOT NULL) AS 예시
FROM (VALUES (1,'지워진 Knowly 계정의 냥대리 기록'),(2,'지갑이 없는 냥대리 계정'),(3,'주인 없는 지갑'),(4,'지갑 내용 이상(음수·형식)'),
  (5,'레벨(질문 수)과 질문 기록 수가 다름'),(6,'역할이 Knowly 계정과 다름'),(7,'하루 질문 보상 20개 초과'),(8,'자기 글에 누른 유익해요'),
  (9,'같은 브라우저 기록을 두 번 올림'),(10,'개인 기록 이름이 허용 목록에 없음'),(11,'개인 기록이 목록이어야 하는데 아님'),(12,'개인 기록 크기 8MB 초과'),
  (13,'anon·authenticated가 nyang 표에 접근 가능')) AS n(no, 항목)
LEFT JOIN checks c ON c.no = n.no
GROUP BY n.no, n.항목 ORDER BY n.no;

-- 참고: 계정별 기록 현황(문제가 없어도 한눈에 보기)
SELECT p.login_id AS 아이디, m.role AS 역할,
  (w.data::jsonb->>'points')::int AS 포인트, (w.data::jsonb->>'questions')::int AS 질문수,
  (SELECT COUNT(*) FROM nyang.posts p WHERE p.author = m.uid) AS 게시글,
  (SELECT COUNT(*) FROM nyang.attendance a WHERE a.uid = m.uid) AS 출석,
  (SELECT string_agg(s.key || '(' || pg_size_pretty(length(s.value)::bigint) || ')', ', ' ORDER BY s.key) FROM nyang.user_state s WHERE s.uid = m.uid) AS 개인기록
FROM nyang.members m LEFT JOIN nyang.wallets w ON w.uid = m.uid LEFT JOIN public.profiles p ON p.id::text = m.uid
ORDER BY p.login_id;
