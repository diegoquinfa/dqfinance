import assert from 'node:assert/strict'
import { test } from 'node:test'
import { todayIn } from '../../shared/dates.ts'
import { openTestDb } from '../../test/fake-d1.ts'
import { seedCardUser, TIMEZONE, USER_ID } from '../../test/seed.ts'
import '../../test/ts-imports.ts'

const { createDb } = await import('../../db.ts')
const { seedDemo } = await import('../demo/seed-demo.ts')
const { shiftDay } = await import('../calendar/calendar-days.ts')
const { runScheduled } = await import('./run-scheduled.ts')

const DAY_MS = 24 * 60 * 60 * 1000

/** The tables that carry a `user_id`. */
const ownedTables = (sqlite: ReturnType<typeof openTestDb>['sqlite']) =>
  sqlite
    .prepare(`SELECT m.name AS name FROM sqlite_master m, pragma_table_info(m.name) c WHERE m.type = 'table' AND c.name = 'user_id'`)
    .all() as { name: string }[]

test('deleting an expired guest removes every row it owns, and nothing else', async () => {
  const { sqlite, d1 } = openTestDb()
  sqlite.exec('PRAGMA foreign_keys = ON')
  seedCardUser(sqlite)
  const now = Date.now()
  // seedCardUser's user is signed in and old: only the anonymous filter keeps it.
  for (const [id, ageDays] of [
    ['guest-old', 8],
    ['guest-new', 1],
  ] as const) {
    sqlite
      .prepare(`INSERT INTO user (id, name, email, email_verified, is_anonymous, created_at, updated_at) VALUES (?, 'Guest', ?, 0, 1, ?, 1)`)
      .run(id, `${id}@example.test`, now - ageDays * DAY_MS)
    sqlite
      .prepare(`INSERT INTO session (id, expires_at, token, created_at, updated_at, user_id) VALUES (?, 1, ?, 1, 1, ?)`)
      .run(`session-${id}`, `token-${id}`, id)
    // The ledger a guest finds when it signs in: settings, products, movements, transfers, and more.
    await seedDemo(createDb(d1), id, 'en')
  }
  // What the demo does not write: a pocket inside a product, and a document attached to one (a `restrict`
  // key to the product, so the document must go before it).
  sqlite
    .prepare(
      `INSERT INTO product (id, user_id, bank_account_id, type, name, currency, parent_product_id, created_at) SELECT 'pocket-old', user_id, bank_account_id, type, 'Pocket', currency, id, 1 FROM product WHERE user_id = 'guest-old' AND parent_product_id IS NULL LIMIT 1`,
    )
    .run()
  sqlite
    .prepare(
      `INSERT INTO document (id, user_id, product_id, name, content_type, size_bytes, r2_key, created_at) SELECT 'doc-old', user_id, id, 'Terms', 'application/pdf', 1, 'key-old', 1 FROM product WHERE user_id = 'guest-old' AND parent_product_id IS NULL LIMIT 1`,
    )
    .run()
  const pockets = sqlite.prepare(`SELECT count(*) AS n FROM product WHERE id = 'pocket-old'`).get() as { n: number }
  assert.equal(pockets.n, 1, 'the guest has a pocket to delete')

  await runScheduled(createDb(d1))

  const users = sqlite.prepare(`SELECT id FROM user ORDER BY id`).all() as { id: string }[]
  assert.deepEqual(
    users.map((row) => row.id),
    ['guest-new', USER_ID],
  )
  for (const { name } of ownedTables(sqlite)) {
    const left = sqlite.prepare(`SELECT count(*) AS n FROM "${name}" WHERE user_id = 'guest-old'`).get() as { n: number }
    assert.equal(left.n, 0, `${name} still holds rows of the deleted guest`)
  }
  const kept = sqlite.prepare(`SELECT count(*) AS n FROM user_settings WHERE user_id = 'guest-new'`).get() as { n: number }
  assert.equal(kept.n, 1)
})

test('every table that a user owns cascades from the user row', () => {
  const { sqlite } = openTestDb()
  sqlite.exec('PRAGMA foreign_keys = ON')
  const tables = ownedTables(sqlite)
  assert.ok(tables.length > 0)
  for (const { name } of tables) {
    const key = sqlite
      .prepare(`SELECT on_delete AS onDelete FROM pragma_foreign_key_list(?) WHERE "table" = 'user' AND "from" = 'user_id'`)
      .get(name) as { onDelete: string } | undefined
    assert.equal(key?.onDelete, 'CASCADE', `${name} must reference user with ON DELETE CASCADE`)
  }
})

test('the daily run checks the bills of a user who asked for a reminder and has an active hook', async () => {
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  const url = 'https://receiver.example.com/dqfinance'
  const tomorrow = shiftDay(todayIn(TIMEZONE), 1)
  sqlite
    .prepare(`INSERT INTO webhook (id, user_id, url, secret, active, created_at) VALUES ('hook-1', ?, ?, 'shhh-secret', 1, 1)`)
    .run(USER_ID, url)
  sqlite
    .prepare(
      `INSERT INTO recurring_expense (id, user_id, name, amount_cents, currency, card_id, category_id, frequency, starts_on, next_due_on, active, created_at) VALUES ('bill-1', ?, 'Gym', 5000000, 'COP', 'card-1', 'category-1', 'monthly', ?, ?, 1, 1)`,
    )
    .run(USER_ID, tomorrow, tomorrow)

  const cases = [
    { name: 'a reminder and an active hook', leadDays: 3, hookActive: 1, called: 1 },
    { name: 'no reminder', leadDays: null, hookActive: 1, called: 0 },
    { name: 'a reminder of zero days', leadDays: 0, hookActive: 1, called: 0 },
    { name: 'no active hook', leadDays: 3, hookActive: 0, called: 0 },
  ]
  const calls: string[] = []
  const original = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls.push(String(input))
    return new Response(null, { status: 204 })
  }) as typeof fetch
  try {
    for (const { name, leadDays, hookActive, called } of cases) {
      sqlite.prepare(`UPDATE user_settings SET reminder_lead_days = ?`).run(leadDays)
      sqlite.prepare(`UPDATE webhook SET active = ?`).run(hookActive)
      // A bill announced by an earlier case would not be announced again: each case starts unannounced.
      sqlite.prepare(`UPDATE recurring_expense SET notified_on = NULL`).run()
      calls.length = 0
      await runScheduled(createDb(d1))
      assert.equal(calls.length, called, name)
      if (called) assert.deepEqual(calls, [url], name)
    }
  } finally {
    globalThis.fetch = original
  }
})
