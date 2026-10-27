CREATE TABLE `card_statement` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`card_id` text NOT NULL,
	`closed_on` text NOT NULL,
	`due_on` text NOT NULL,
	`payment_cents` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`card_id`) REFERENCES `card`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `card_statement_user_idx` ON `card_statement` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `card_statement_card_cut_idx` ON `card_statement` (`card_id`,`closed_on`);