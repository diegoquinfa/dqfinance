ALTER TABLE `expected_income` ADD `counterparty_id` text REFERENCES counterparty(id) ON DELETE set null;
