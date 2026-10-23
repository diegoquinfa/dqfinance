import assert from 'node:assert/strict'
import type { DatabaseSync } from 'node:sqlite'
import { afterEach, mock, test } from 'node:test'
import { openTestDb } from '../../test/fake-d1.ts'
import { seedCardUser, USER_ID } from '../../test/seed.ts'
import '../../test/ts-imports.ts'

const { createDb } = await import('../../db.ts')
const { celebrateGoal } = await import('./celebrate-goal.ts')

const NOW = '2026-10-15T15:00:00Z'
afterEach(() => mock.timers.reset())

const seedGoal = (sqlite: DatabaseSync, id: string, userId: string, targetCents: number) =>
  sqlite
    .prepare('INSERT INTO savings_goal (id, user_id, name, target_cents, currency, active, created_at) VALUES (?, ?, ?, ?, ?, 1, 1)')
    .run(id, userId, id, targetCents, 'COP')

const contribute = (sqlite: DatabaseSync, goalId: string, userId: string, amountCents: number) =>
  sqlite
    .prepare(
      'INSERT INTO savings_contribution (id, user_id, goal_id, amount_cents, contributed_on, created_at) VALUES (?, ?, ?, ?, ?, 1)',
    )
    .run(`${goalId}-${userId}-${amountCents}`, userId, goalId, amountCents, '2026-10-01')

const celebratedAt = (sqlite: DatabaseSync, id: string) =>
  (sqlite.prepare('SELECT celebrated_at AS at FROM savings_goal WHERE id = ?').get(id) as { at: number | null }).at

/** A user with a reached goal, an unreached goal, and another user's reached goal. */
const setUp = () => {
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  sqlite.prepare(`INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES ('user-2', 'Ben', 'ben@example.com', 1, 1, 1)`).run()
  seedGoal(sqlite, 'reached', USER_ID, 100_000)
  contribute(sqlite, 'reached', USER_ID, 100_000)
  seedGoal(sqlite, 'unreached', USER_ID, 100_000)
  contribute(sqlite, 'unreached', USER_ID, 99_999)
  seedGoal(sqlite, 'theirs', 'user-2', 100_000)
  contribute(sqlite, 'theirs', 'user-2', 100_000)
  return { sqlite, db: createDb(d1) }
}

test('a reached goal is celebrated at the current time', async () => {
  mock.timers.enable({ apis: ['Date'], now: new Date(NOW) })
  const { sqlite, db } = setUp()

  assert.deepEqual(await celebrateGoal(db, USER_ID, 'reached'), { id: 'reached', celebrated: true })
  assert.equal(celebratedAt(sqlite, 'reached'), Date.parse(NOW))
})

test('a goal not reached yet stays uncelebrated', async () => {
  mock.timers.enable({ apis: ['Date'], now: new Date(NOW) })
  const { sqlite, db } = setUp()

  assert.deepEqual(await celebrateGoal(db, USER_ID, 'unreached'), { id: 'unreached', celebrated: false })
  assert.equal(celebratedAt(sqlite, 'unreached'), null)
})

test("another user's goal is not found and stays uncelebrated", async () => {
  mock.timers.enable({ apis: ['Date'], now: new Date(NOW) })
  const { sqlite, db } = setUp()

  await assert.rejects(celebrateGoal(db, USER_ID, 'theirs'), { code: 'savings_goal_not_found', status: 404 })
  assert.equal(celebratedAt(sqlite, 'theirs'), null)
})

test('celebrating twice keeps the first time', async () => {
  mock.timers.enable({ apis: ['Date'], now: new Date(NOW) })
  const { sqlite, db } = setUp()
  await celebrateGoal(db, USER_ID, 'reached')

  mock.timers.tick(60_000)
  assert.deepEqual(await celebrateGoal(db, USER_ID, 'reached'), { id: 'reached', celebrated: true })
  assert.equal(celebratedAt(sqlite, 'reached'), Date.parse(NOW))
})
