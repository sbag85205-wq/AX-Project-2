CREATE TABLE `attendance` (
	`uid` text NOT NULL,
	`day` text NOT NULL,
	`points` integer NOT NULL,
	`tokens` integer NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`uid`, `day`)
);
--> statement-breakpoint
CREATE TABLE `likes` (
	`post` text NOT NULL,
	`uid` text NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`post`, `uid`),
	FOREIGN KEY (`post`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `members` (
	`email` text PRIMARY KEY NOT NULL,
	`uid` text,
	`role` text NOT NULL,
	`department` text DEFAULT '' NOT NULL,
	`name` text DEFAULT '담당자' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_uid_unique` ON `members` (`uid`);--> statement-breakpoint
CREATE TABLE `operations` (
	`uid` text NOT NULL,
	`id` text NOT NULL,
	`kind` text NOT NULL,
	`result` text NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`uid`, `id`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`author` text NOT NULL,
	`hash` text NOT NULL,
	`category` text NOT NULL,
	`body` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post_once` ON `posts` (`author`,`hash`);--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`uid` text NOT NULL,
	`hash` text NOT NULL,
	`day` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `question_once` ON `questions` (`uid`,`hash`);--> statement-breakpoint
CREATE TABLE `replies` (
	`id` text PRIMARY KEY NOT NULL,
	`post` text NOT NULL,
	`staff` text NOT NULL,
	`department` text NOT NULL,
	`name` text NOT NULL,
	`body` text NOT NULL,
	`source` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`post`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `wallets` (
	`uid` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL
);
