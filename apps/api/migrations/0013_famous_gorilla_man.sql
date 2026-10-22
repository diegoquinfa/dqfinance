CREATE TABLE `webhook` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`url` text NOT NULL,
	`secret` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `webhook_user_idx` ON `webhook` (`user_id`);--> statement-breakpoint
ALTER TABLE `recurring_expense` ADD `notified_on` text;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `reminder_lead_days` integer;