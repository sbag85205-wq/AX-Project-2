CREATE TABLE `demo_deleted_posts` (
	`post` text PRIMARY KEY NOT NULL,
	`deleted_by` text NOT NULL,
	`deleted_at` text NOT NULL,
	FOREIGN KEY (`post`) REFERENCES `demo_posts`(`id`) ON UPDATE no action ON DELETE no action
);
