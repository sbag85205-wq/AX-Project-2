-- Additive integration: existing Knowly tables, RLS, Auth, search and storage are unchanged.
-- Private schema, accessible only from the authenticated Edge Function's server connection.
CREATE SCHEMA nyang;
REVOKE ALL ON SCHEMA nyang FROM PUBLIC, anon, authenticated;
CREATE TABLE nyang.members (email text PRIMARY KEY, uid text UNIQUE, role text NOT NULL, department text NOT NULL DEFAULT '', name text NOT NULL DEFAULT '직원', active integer NOT NULL DEFAULT 1);
CREATE TABLE nyang.wallets (uid text PRIMARY KEY, data text NOT NULL, version integer NOT NULL DEFAULT 0);
CREATE TABLE nyang.questions (id text PRIMARY KEY, uid text NOT NULL, hash text NOT NULL, day text NOT NULL, created text NOT NULL, UNIQUE(uid, hash));
CREATE TABLE nyang.posts (id text PRIMARY KEY, author text NOT NULL, hash text NOT NULL, category text NOT NULL, body text NOT NULL, created text NOT NULL, UNIQUE(author, hash));
CREATE TABLE nyang.likes (post text REFERENCES nyang.posts(id), uid text NOT NULL, created text NOT NULL, PRIMARY KEY(post, uid));
CREATE TABLE nyang.replies (id text PRIMARY KEY, post text NOT NULL REFERENCES nyang.posts(id), staff text NOT NULL, department text NOT NULL, name text NOT NULL, body text NOT NULL, source text NOT NULL, created text NOT NULL);
CREATE TABLE nyang.attendance (uid text NOT NULL, day text NOT NULL, points integer NOT NULL, tokens integer NOT NULL, created text NOT NULL, PRIMARY KEY(uid, day));
CREATE TABLE nyang.operations (uid text NOT NULL, id text NOT NULL, kind text NOT NULL, result text NOT NULL, created text NOT NULL, PRIMARY KEY(uid, id));
CREATE TABLE nyang.deleted_posts (post text PRIMARY KEY REFERENCES nyang.posts(id), deleted_by text NOT NULL, deleted_at text NOT NULL);
CREATE INDEX nyang_posts_created ON nyang.posts(created);
CREATE INDEX nyang_questions_day ON nyang.questions(uid, day);
CREATE FUNCTION nyang.reward() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF TG_TABLE_NAME = 'questions' THEN
  UPDATE nyang.wallets SET data = (data::jsonb || jsonb_build_object('points', COALESCE((data::jsonb->>'points')::int,0)+10, 'questions', COALESCE((data::jsonb->>'questions')::int,0)+1))::text, version=version+1 WHERE uid=NEW.uid;
 ELSIF TG_TABLE_NAME = 'attendance' THEN
  UPDATE nyang.wallets SET data = (data::jsonb || jsonb_build_object('points', COALESCE((data::jsonb->>'points')::int,0)+NEW.points, 'treatTokens', COALESCE((data::jsonb->>'treatTokens')::int,0)+NEW.tokens))::text, version=version+1 WHERE uid=NEW.uid;
 ELSE
  UPDATE nyang.wallets SET data = (data::jsonb || jsonb_build_object('points', COALESCE((data::jsonb->>'points')::int,0)+5))::text, version=version+1 WHERE uid=(SELECT author FROM nyang.posts WHERE id=NEW.post) AND uid<>NEW.uid;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER question_reward AFTER INSERT ON nyang.questions FOR EACH ROW EXECUTE FUNCTION nyang.reward();
CREATE TRIGGER attendance_reward AFTER INSERT ON nyang.attendance FOR EACH ROW EXECUTE FUNCTION nyang.reward();
CREATE TRIGGER like_reward AFTER INSERT ON nyang.likes FOR EACH ROW EXECUTE FUNCTION nyang.reward();
REVOKE ALL ON ALL TABLES IN SCHEMA nyang FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA nyang FROM PUBLIC, anon, authenticated;
