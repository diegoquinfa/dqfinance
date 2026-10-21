ALTER TABLE `transaction` ADD `title` text;
-- The old description was the row title (D15): it moves to `title`, and `description` starts empty.
UPDATE `transaction` SET `title` = `description`;
UPDATE `transaction` SET `description` = NULL;
