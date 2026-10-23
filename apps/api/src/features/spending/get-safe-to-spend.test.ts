import assert from 'node:assert/strict'
import { afterEach, mock, test } from 'node:test'
import { openTestDb } from '../../test/fake-d1.ts'
import { seedCardUser, USER_ID } from '../../test/seed.ts'
import '../../test/ts-imports.ts'

const { createDb } = await import('../../db.ts')
const { getSafeToSpend } = await import('./get-safe-to-spend.ts')

// Mid-October in Bogota: the month and the day the spend is measured on are the ones of this instant.
const pinClock = () => mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-15T15:00:00Z') })
afterEach(() => mock.timers.reset())

/**
 * A USD charge on a COP card stores both amounts; the month spend counts the COP one, like the
 * card's debt. The cap equals that COP value, so the charge uses it up exactly: a daily cap of zero
 * proves the month spend holds 40,000,000 (and neither the 10,000 USD nor nothing).
 */
test('a foreign charge counts its value in the card currency', async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite, 40_000_000)
  // The first of the month at noon UTC: inside the month on the user's clock.
  const occurredAt = new Date('2026-10-01T12:00:00Z')
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
