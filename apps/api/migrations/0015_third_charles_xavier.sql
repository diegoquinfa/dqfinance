ALTER TABLE `savings_goal` ADD `celebrated_at` integer;--> statement-breakpoint
-- Goals already reached before this deploy count as celebrated, so they do not all burst at once.
UPDATE `savings_goal` SET `celebrated_at` = cast(unixepoch('subsecond') * 1000 as integer)
WHERE `target_cents` <= (
	SELECT coalesce(sum(`savings_contribution`.`amount_cents`), 0) FROM `savings_contribution`
	WHERE `savings_contribution`.`goal_id` = `savings_goal`.`id`
		AND `savings_contribution`.`user_id` = `savings_goal`.`user_id`
);
