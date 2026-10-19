ALTER TABLE `product` ADD `parent_product_id` text REFERENCES product(id);--> statement-breakpoint
ALTER TABLE `product` ADD `yield_payout` text;