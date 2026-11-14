CREATE TABLE `demo_attendance` (
	`uid` text NOT NULL,
	`day` text NOT NULL,
	`points` integer NOT NULL,
	`tokens` integer NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`uid`, `day`)
);
--> statement-breakpoint
CREATE TABLE `demo_likes` (
	`post` text NOT NULL,
	`uid` text NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`post`, `uid`),
	FOREIGN KEY (`post`) REFERENCES `demo_posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `demo_login_limits` (
	`ip` text NOT NULL,
	`bucket` integer NOT NULL,
	`attempts` integer NOT NULL,
	PRIMARY KEY(`ip`, `bucket`)
);
--> statement-breakpoint
CREATE TABLE `demo_members` (
	`email` text PRIMARY KEY NOT NULL,
	`uid` text,
	`role` text NOT NULL,
	`department` text DEFAULT '' NOT NULL,
	`name` text DEFAULT '담당자' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `demo_members_uid_unique` ON `demo_members` (`uid`);--> statement-breakpoint
CREATE TABLE `demo_operations` (
	`uid` text NOT NULL,
	`id` text NOT NULL,
	`kind` text NOT NULL,
	`result` text NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`uid`, `id`)
);
--> statement-breakpoint
CREATE TABLE `demo_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`author` text NOT NULL,
	`hash` text NOT NULL,
	`category` text NOT NULL,
	`body` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `demo_post_once` ON `demo_posts` (`author`,`hash`);--> statement-breakpoint
CREATE TABLE `demo_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`uid` text NOT NULL,
	`hash` text NOT NULL,
	`day` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `demo_question_once` ON `demo_questions` (`uid`,`hash`);--> statement-breakpoint
CREATE TABLE `demo_replies` (
	`id` text PRIMARY KEY NOT NULL,
	`post` text NOT NULL,
	`staff` text NOT NULL,
	`department` text NOT NULL,
	`name` text NOT NULL,
	`body` text NOT NULL,
	`source` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`post`) REFERENCES `demo_posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `demo_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`expires` integer NOT NULL,
	`credential_version` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `demo_wallets` (
	`uid` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL
);

--> statement-breakpoint
CREATE TRIGGER demo_question_reward AFTER INSERT ON demo_questions BEGIN
 UPDATE demo_wallets SET data=json_set(data,
 '$.points',json_extract(data,'$.points')+10,
 '$.demo_questions',json_extract(data,'$.demo_questions')+1),version=version+1 WHERE uid=NEW.uid;
END;
--> statement-breakpoint
CREATE TRIGGER demo_attendance_reward AFTER INSERT ON demo_attendance BEGIN
 UPDATE demo_wallets SET data=json_set(data,
 '$.points',json_extract(data,'$.points')+NEW.points,
 '$.treatTokens',COALESCE(json_extract(data,'$.treatTokens'),0)+NEW.tokens),
 version=version+1 WHERE uid=NEW.uid;
END;
--> statement-breakpoint
CREATE TRIGGER demo_like_reward AFTER INSERT ON demo_likes BEGIN
 UPDATE demo_wallets SET data=json_set(data,'$.points',json_extract(data,'$.points')+5),version=version+1
 WHERE uid=(SELECT author FROM demo_posts WHERE id=NEW.post) AND uid<>NEW.uid;
END;
