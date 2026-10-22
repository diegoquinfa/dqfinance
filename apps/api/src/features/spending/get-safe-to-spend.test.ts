import assert from 'node:assert/strict'
import { test } from 'node:test'
import { todayIn } from '../../shared/dates.ts'
import { openTestDb } from '../../test/fake-d1.ts'
import { seedCardUser, TIMEZONE, USER_ID } from '../../test/seed.ts'
import '../../test/ts-imports.ts'

const { createDb } = await import('../../db.ts')
const { getSafeToSpend } = await import('./get-safe-to-spend.ts')

/**
 * A USD charge on a COP card stores both amounts; the month spend counts the COP one, like the
 * card's debt. The cap equals that COP value, so the charge uses it up exactly: a daily cap of zero
 * proves the month spend holds 40,000,000 (and neither the 10,000 USD nor nothing).
 */
test('a foreign charge counts its value in the card currency', async () => {
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite, 40_000_000)
  const today = todayIn(TIMEZONE)
  // The first of the month at noon UTC: inside the month on the user's clock whatever the day.
  const occurredAt = new Date(`${today.slice(0, 7)}-01T12:00:00Z`)
  sqlite
    .prepare(
      `INSERT INTO \`transaction\` (id, user_id, type, amount_cents, currency, card_id, primary_amount_cents, category_id, occurred_at, created_at) VALUES ('charge', ?, 'expense', 10000, 'USD', 'card-1', 40000000, 'category-1', ?, 1)`,
    )
    .run(USER_ID, occurredAt.getTime())

  const result = await getSafeToSpend(createDb(d1), USER_ID)
  assert.equal(result.currency, 'COP')
  assert.equal(result.target, 400_000)
  assert.equal(result.targetDaily, 0)
})
