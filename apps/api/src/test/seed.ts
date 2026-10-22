import type { DatabaseSync, SQLInputValue } from 'node:sqlite'

export const USER_ID = 'user-1'
export const TIMEZONE = 'America/Bogota'

/**
 * One user in Bogotá with a COP credit card and an expense category: the world both money queries
 * read. `spendingTargetCents` is the monthly cap safe-to-spend starts from.
 */
export const seedCardUser = (sqlite: DatabaseSync, spendingTargetCents: number | null = null) => {
  const run = (sql: string, ...params: SQLInputValue[]) => sqlite.prepare(sql).run(...params)
  run(`INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (?, 'Ana', 'ana@example.com', 1, 1, 1)`, USER_ID)
  run(
    `INSERT INTO user_settings (user_id, country, locale, timezone, primary_currency, spending_target_cents, onboarded_at) VALUES (?, 'CO', 'en', ?, 'COP', ?, 1)`,
    USER_ID,
    TIMEZONE,
    spendingTargetCents,
  )
  run(`INSERT INTO bank (id, user_id, name, created_at) VALUES ('bank-1', ?, 'Bank', 1)`, USER_ID)
  run(`INSERT INTO bank_account (id, user_id, bank_id, name, created_at) VALUES ('account-1', ?, 'bank-1', 'Checking', 1)`, USER_ID)
  run(
    `INSERT INTO product (id, user_id, bank_account_id, type, name, currency, created_at) VALUES ('product-1', ?, 'account-1', 'checking', 'Card', 'COP', 1)`,
    USER_ID,
  )
  run(`INSERT INTO card (id, user_id, product_id, kind, name, created_at) VALUES ('card-1', ?, 'product-1', 'credit', 'Visa', 1)`, USER_ID)
  run(`INSERT INTO category (id, user_id, name, kind, created_at) VALUES ('category-1', ?, 'Food', 'expense', 1)`, USER_ID)
}
