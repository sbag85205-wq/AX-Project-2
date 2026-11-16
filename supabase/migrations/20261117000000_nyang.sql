-- 냥대리 활동 기록(포인트·출석·질문 게시판·꾸미기)과 개인 기록(내 일정·대화 기록 등)을 서버에 저장한다.
-- 전에는 브라우저 안에만 저장해서 다른 PC로 로그인하면 기록이 보이지 않았다.
-- 기존 Knowly 표·권한·검색·저장소는 바꾸지 않는다. 새 공간(nyang)만 더한다.
-- nyang 공간은 로그인한 사용자를 확인한 서버 함수(supabase/functions/nyang)만 쓴다. 브라우저에서 직접 읽거나 쓸 수 없다.
CREATE SCHEMA IF NOT EXISTS nyang;
REVOKE ALL ON SCHEMA nyang FROM PUBLIC, anon, authenticated;

-- 브라우저 저장소(nyang-frontend/drizzle)와 같은 모양. 규칙 코드를 그대로 쓰려고 글자·숫자 형식도 같게 둔다.
CREATE TABLE nyang.members (email text PRIMARY KEY, uid text UNIQUE, role text NOT NULL, department text NOT NULL DEFAULT '', name text NOT NULL DEFAULT '직원', active integer NOT NULL DEFAULT 1);
CREATE TABLE nyang.wallets (uid text PRIMARY KEY, data text NOT NULL, version integer NOT NULL DEFAULT 0);
CREATE TABLE nyang.questions (id text PRIMARY KEY, uid text NOT NULL, hash text NOT NULL, day text NOT NULL, created text NOT NULL, UNIQUE (uid, hash));
CREATE TABLE nyang.posts (id text PRIMARY KEY, author text NOT NULL, hash text NOT NULL, category text NOT NULL, body text NOT NULL, created text NOT NULL, UNIQUE (author, hash));
CREATE TABLE nyang.likes (post text NOT NULL REFERENCES nyang.posts(id), uid text NOT NULL, created text NOT NULL, PRIMARY KEY (post, uid));
CREATE TABLE nyang.replies (id text PRIMARY KEY, post text NOT NULL REFERENCES nyang.posts(id), staff text NOT NULL, department text NOT NULL, name text NOT NULL, body text NOT NULL, source text NOT NULL, created text NOT NULL);
CREATE TABLE nyang.attendance (uid text NOT NULL, day text NOT NULL, points integer NOT NULL, tokens integer NOT NULL, created text NOT NULL, PRIMARY KEY (uid, day));
CREATE TABLE nyang.operations (uid text NOT NULL, id text NOT NULL, kind text NOT NULL, result text NOT NULL, created text NOT NULL, PRIMARY KEY (uid, id));
CREATE TABLE nyang.deleted_posts (post text PRIMARY KEY REFERENCES nyang.posts(id), deleted_by text NOT NULL, deleted_at text NOT NULL);
-- 계정별 개인 기록: 내 일정, 대화 기록, 내 활동 기록, 배경·성격 설정 (key마다 JSON 글자 하나)
CREATE TABLE nyang.user_state (uid text NOT NULL, key text NOT NULL, value text NOT NULL, updated text NOT NULL, PRIMARY KEY (uid, key));

CREATE INDEX nyang_posts_created ON nyang.posts (created);
CREATE INDEX nyang_questions_day ON nyang.questions (uid, day);
CREATE INDEX nyang_replies_post ON nyang.replies (post);
CREATE INDEX nyang_attendance_day ON nyang.attendance (day);

-- 포인트 규칙(브라우저 저장소의 트리거와 같다): 새 질문 +10 P·질문 수 +1, 출석 선물, 내 글이 받은 유익해요 +10 P.
-- 브라우저에 있던 기존 기록을 올리는 동안(nyang.importing = '1')에는 건너뛴다. 그 포인트는 이미 옮겨 온 지갑에 들어 있다.
CREATE FUNCTION nyang.reward() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_setting('nyang.importing', true) = '1' THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'questions' THEN
    UPDATE nyang.wallets SET data = (data::jsonb || jsonb_build_object(
      'points', COALESCE((data::jsonb->>'points')::int, 0) + 10,
      'questions', COALESCE((data::jsonb->>'questions')::int, 0) + 1))::text, version = version + 1 WHERE uid = NEW.uid;
  ELSIF TG_TABLE_NAME = 'attendance' THEN
    UPDATE nyang.wallets SET data = (data::jsonb || jsonb_build_object(
      'points', COALESCE((data::jsonb->>'points')::int, 0) + NEW.points,
      'treatTokens', COALESCE((data::jsonb->>'treatTokens')::int, 0) + NEW.tokens))::text, version = version + 1 WHERE uid = NEW.uid;
  ELSE
    UPDATE nyang.wallets SET data = (data::jsonb || jsonb_build_object(
      'points', COALESCE((data::jsonb->>'points')::int, 0) + 10))::text, version = version + 1
      WHERE uid = (SELECT author FROM nyang.posts WHERE id = NEW.post) AND uid <> NEW.uid;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER question_reward AFTER INSERT ON nyang.questions FOR EACH ROW EXECUTE FUNCTION nyang.reward();
CREATE TRIGGER attendance_reward AFTER INSERT ON nyang.attendance FOR EACH ROW EXECUTE FUNCTION nyang.reward();
CREATE TRIGGER like_reward AFTER INSERT ON nyang.likes FOR EACH ROW EXECUTE FUNCTION nyang.reward();

-- 브라우저(anon·authenticated)에서는 접근할 수 없다. 행 보안도 켜 둔다(정책 없음 = 모두 거부).
ALTER TABLE nyang.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE nyang.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE nyang.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nyang.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE nyang.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE nyang.replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE nyang.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE nyang.operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE nyang.deleted_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE nyang.user_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA nyang FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA nyang FROM PUBLIC, anon, authenticated;
