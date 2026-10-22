import assert from 'node:assert/strict'
import { test } from 'node:test'
import { todayIn } from '../../shared/dates.ts'
import { openTestDb } from '../../test/fake-d1.ts'
import { seedCardUser, TIMEZONE, USER_ID } from '../../test/seed.ts'
import '../../test/ts-imports.ts'

const { createDb } = await import('../../db.ts')
const { listBudgets } = await import('./list-budgets.ts')

/**
 * A 600,000 purchase over six months weighs 100,000 on every month it spans. The query has to keep
 * the spread expense after its own month has passed (the installment clause) and charge only that
 * month's share: dropping either one moves the number the budget reports.
 */
test('a spread purchase weighs its share on every month it spans', async () => {
  const today = todayIn(TIMEZONE)
  const [year, month] = today.split('-').map(Number) as [number, number]
  // The six months the purchase spans, the current one last.
  for (let back = 5; back >= 0; back--) {
    const { sqlite, d1 } = openTestDb()
    seedCardUser(sqlite)
    sqlite
      .prepare(`INSERT INTO budget (id, user_id, category_id, amount_cents, currency, created_at) VALUES ('budget-1', ?, 'category-1', 20000000, 'COP', 1)`)
      .run(USER_ID)
    // 60,000,000 cents over six months: 10,000,000 cents a month, against a 20,000,000 limit.
    const startedOn = new Date(Date.UTC(year, month - 1 - back, 10, 15))
    sqlite
      .prepare(
        `INSERT INTO \`transaction\` (id, user_id, type, amount_cents, currency, card_id, category_id, installment_months, occurred_at, created_at) VALUES ('spread', ?, 'expense', 60000000, 'COP', 'card-1', 'category-1', 6, ?, 1)`,
      )
      .run(USER_ID, startedOn.getTime())

    const [view] = await listBudgets(createDb(d1), USER_ID)
    assert.ok(view)
    assert.equal(view.spent, 100_000, `the share of ${startedOn.toISOString().slice(0, 7)}`)
    assert.equal(view.ratio, 0.5)
  }
})
