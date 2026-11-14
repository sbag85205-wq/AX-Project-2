DROP TRIGGER demo_question_reward;
--> statement-breakpoint
CREATE TRIGGER demo_question_reward AFTER INSERT ON demo_questions BEGIN
 UPDATE demo_wallets SET data=json_set(data,
 '$.points',json_extract(data,'$.points')+10,
 '$.questions',json_extract(data,'$.questions')+1),version=version+1 WHERE uid=NEW.uid;
END;
