CREATE TRIGGER question_reward AFTER INSERT ON questions BEGIN
 UPDATE wallets SET data=json_set(data,
 '$.points',json_extract(data,'$.points')+10,
 '$.questions',json_extract(data,'$.questions')+1),version=version+1 WHERE uid=NEW.uid;
END;
--> statement-breakpoint
CREATE TRIGGER attendance_reward AFTER INSERT ON attendance BEGIN
 UPDATE wallets SET data=json_set(data,
 '$.points',json_extract(data,'$.points')+NEW.points,
 '$.treatTokens',COALESCE(json_extract(data,'$.treatTokens'),0)+NEW.tokens),
 version=version+1 WHERE uid=NEW.uid;
END;
--> statement-breakpoint
CREATE TRIGGER like_reward AFTER INSERT ON likes BEGIN
 UPDATE wallets SET data=json_set(data,'$.points',json_extract(data,'$.points')+5),version=version+1
 WHERE uid=(SELECT author FROM posts WHERE id=NEW.post) AND uid<>NEW.uid;
END;
