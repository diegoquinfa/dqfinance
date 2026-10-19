CREATE TABLE `document` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`product_id` text,
	`cash_wallet_id` text,
	`card_id` text,
	`name` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`r2_key` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`cash_wallet_id`) REFERENCES `cash_wallet`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`card_id`) REFERENCES `card`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "document_one_source" CHECK((("document"."product_id" is not null) + ("document"."cash_wallet_id" is not null) + ("document"."card_id" is not null)) = 1)
);
--> statement-breakpoint
CREATE INDEX `document_user_idx` ON `document` (`user_id`);