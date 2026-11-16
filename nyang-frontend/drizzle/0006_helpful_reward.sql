-- 질문 게시판 '유익해요'(원래 좋아요): 다른 직원이 누르면 글쓴이에게 10 P (원래 5 P).
DROP TRIGGER IF EXISTS like_reward;
--> statement-breakpoint
CREATE TRIGGER like_reward AFTER INSERT ON likes BEGIN
 UPDATE wallets SET data=json_set(data,'$.points',json_extract(data,'$.points')+10),version=version+1
 WHERE uid=(SELECT author FROM posts WHERE id=NEW.post) AND uid<>NEW.uid;
END;
--> statement-breakpoint
DROP TRIGGER IF EXISTS demo_like_reward;
--> statement-breakpoint
CREATE TRIGGER demo_like_reward AFTER INSERT ON demo_likes BEGIN
 UPDATE demo_wallets SET data=json_set(data,'$.points',json_extract(data,'$.points')+10),version=version+1
 WHERE uid=(SELECT author FROM demo_posts WHERE id=NEW.post) AND uid<>NEW.uid;
END;
--> statement-breakpoint
DROP TRIGGER IF EXISTS visitor_like_reward;
--> statement-breakpoint
CREATE TRIGGER visitor_like_reward AFTER INSERT ON visitor_likes BEGIN
 UPDATE visitor_wallets SET data=json_set(data,'$.points',json_extract(data,'$.points')+10),version=version+1
 WHERE uid=(SELECT author FROM visitor_posts WHERE id=NEW.post) AND uid<>NEW.uid;
END;
