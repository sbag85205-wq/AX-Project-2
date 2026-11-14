CREATE TABLE `visitor_attendance` (
	`uid` text NOT NULL,
	`day` text NOT NULL,
	`points` integer NOT NULL,
	`tokens` integer NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`uid`, `day`)
);
--> statement-breakpoint
CREATE TABLE `visitor_likes` (
	`post` text NOT NULL,
	`uid` text NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`post`, `uid`),
	FOREIGN KEY (`post`) REFERENCES `visitor_posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `visitor_members` (
	`email` text PRIMARY KEY NOT NULL,
	`uid` text,
	`role` text NOT NULL,
	`department` text DEFAULT '' NOT NULL,
	`name` text DEFAULT '담당자' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `visitor_members_uid_unique` ON `visitor_members` (`uid`);--> statement-breakpoint
CREATE TABLE `visitor_operations` (
	`uid` text NOT NULL,
	`id` text NOT NULL,
	`kind` text NOT NULL,
	`result` text NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`uid`, `id`)
);
--> statement-breakpoint
CREATE TABLE `visitor_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`author` text NOT NULL,
	`hash` text NOT NULL,
	`category` text NOT NULL,
	`body` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `visitor_post_once` ON `visitor_posts` (`author`,`hash`);--> statement-breakpoint
CREATE TABLE `visitor_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`uid` text NOT NULL,
	`hash` text NOT NULL,
	`day` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `visitor_question_once` ON `visitor_questions` (`uid`,`hash`);--> statement-breakpoint
CREATE TABLE `visitor_replies` (
	`id` text PRIMARY KEY NOT NULL,
	`post` text NOT NULL,
	`staff` text NOT NULL,
	`department` text NOT NULL,
	`name` text NOT NULL,
	`body` text NOT NULL,
	`source` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`post`) REFERENCES `visitor_posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `visitor_wallets` (
	`uid` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL
);

--> statement-breakpoint
CREATE TRIGGER visitor_question_reward AFTER INSERT ON visitor_questions BEGIN
 UPDATE visitor_wallets SET data=json_set(data,
 '$.points',json_extract(data,'$.points')+10,
 '$.questions',json_extract(data,'$.questions')+1),version=version+1 WHERE uid=NEW.uid;
END;
--> statement-breakpoint
CREATE TRIGGER visitor_attendance_reward AFTER INSERT ON visitor_attendance BEGIN
 UPDATE visitor_wallets SET data=json_set(data,
 '$.points',json_extract(data,'$.points')+NEW.points,
 '$.treatTokens',COALESCE(json_extract(data,'$.treatTokens'),0)+NEW.tokens),
 version=version+1 WHERE uid=NEW.uid;
END;
--> statement-breakpoint
CREATE TRIGGER visitor_like_reward AFTER INSERT ON visitor_likes BEGIN
 UPDATE visitor_wallets SET data=json_set(data,'$.points',json_extract(data,'$.points')+5),version=version+1
 WHERE uid=(SELECT author FROM visitor_posts WHERE id=NEW.post) AND uid<>NEW.uid;
END;
