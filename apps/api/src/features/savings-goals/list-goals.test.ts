import assert from 'node:assert/strict'
import type { DatabaseSync } from 'node:sqlite'
import { afterEach, mock, test } from 'node:test'
import { openTestDb } from '../../test/fake-d1.ts'
import { seedCardUser, USER_ID } from '../../test/seed.ts'
import '../../test/ts-imports.ts'

const { createDb } = await import('../../db.ts')
const { listGoals } = await import('./list-goals.ts')

// Mid-October in Bogotá: the goal dated in December has three months left, counting this one.
const pinClock = () => mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-15T15:00:00Z') })
afterEach(() => mock.timers.reset())

const seedGoal = (sqlite: DatabaseSync, id: string, userId: string, fields: { active: 0 | 1; createdAt: number; targetDate: string | null; targetCents: number }) =>
  sqlite
    .prepare(
      'INSERT INTO savings_goal (id, user_id, name, target_cents, currency, target_date, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .run(id, userId, id, fields.targetCents, 'COP', fields.targetDate, fields.active, fields.createdAt)

const contribute = (sqlite: DatabaseSync, goalId: string, userId: string, amountCents: number) =>
  sqlite
    .prepare(
      'INSERT INTO savings_contribution (id, user_id, goal_id, amount_cents, contributed_on, created_at) VALUES (?, ?, ?, ?, ?, 1)',
    )
    .run(`${goalId}-${userId}-${amountCents}`, userId, goalId, amountCents, '2026-10-01')

test('each goal shows the sum of its contributions, and an inactive goal is left out', async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  // A 30,000 COP car by December: 7,500 is saved, 22,500 is left, 7,500 a month for three months.
  seedGoal(sqlite, 'goal-1', USER_ID, { active: 1, createdAt: 1, targetDate: '2026-12-31', targetCents: 3_000_000 })
  contribute(sqlite, 'goal-1', USER_ID, 500_000)
  contribute(sqlite, 'goal-1', USER_ID, 250_000)
  seedGoal(sqlite, 'goal-2', USER_ID, { active: 1, createdAt: 2, targetDate: null, targetCents: 1_000_000 })
  seedGoal(sqlite, 'goal-3', USER_ID, { active: 0, createdAt: 3, targetDate: null, targetCents: 1_000_000 })
  contribute(sqlite, 'goal-3', USER_ID, 400_000)

  const goals = await listGoals(createDb(d1), USER_ID)

  assert.deepEqual(
    goals.map(({ id, contributed, remaining, ratio, monthsLeft, monthly }) => ({ id, contributed, remaining, ratio, monthsLeft, monthly })),
    [
      { id: 'goal-1', contributed: 7500, remaining: 22500, ratio: 0.25, monthsLeft: 3, monthly: 7500 },
      { id: 'goal-2', contributed: 0, remaining: 10000, ratio: 0, monthsLeft: null, monthly: 0 },
    ],
  )
})

test("another user's goals and contributions are not counted", async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  sqlite.prepare(`INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES ('user-2', 'Ben', 'ben@example.com', 1, 1, 1)`).run()
  seedGoal(sqlite, 'goal-1', USER_ID, { active: 1, createdAt: 1, targetDate: '2026-12-31', targetCents: 3_000_000 })
  contribute(sqlite, 'goal-1', USER_ID, 750_000)
  seedGoal(sqlite, 'other-goal', 'user-2', { active: 1, createdAt: 2, targetDate: null, targetCents: 1_000_000 })
  contribute(sqlite, 'other-goal', 'user-2', 900_000)
  // The other user's money into this user's goal: the goal's sum is the user's own contributions only.
  contribute(sqlite, 'goal-1', 'user-2', 1_000_000)

  const goals = await listGoals(createDb(d1), USER_ID)

  assert.deepEqual(goals.map((goal) => goal.id), ['goal-1'])
  assert.equal(goals[0]?.contributed, 7500)
})

test('a goal reports whether its contributions reached the target, and whether it was celebrated', async () => {
  pinClock()
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  seedGoal(sqlite, 'reached', USER_ID, { active: 1, createdAt: 1, targetDate: null, targetCents: 1_000_000 })
  contribute(sqlite, 'reached', USER_ID, 1_000_000)
  seedGoal(sqlite, 'short', USER_ID, { active: 1, createdAt: 2, targetDate: null, targetCents: 1_000_000 })
  contribute(sqlite, 'short', USER_ID, 999_999)
  seedGoal(sqlite, 'celebrated', USER_ID, { active: 1, createdAt: 3, targetDate: null, targetCents: 1_000_000 })
  contribute(sqlite, 'celebrated', USER_ID, 1_000_000)
  sqlite.prepare('UPDATE savings_goal SET celebrated_at = 1 WHERE id = ?').run('celebrated')

  const goals = await listGoals(createDb(d1), USER_ID)

  assert.deepEqual(
    goals.map(({ id, reached, celebrated }) => ({ id, reached, celebrated })),
    [
      { id: 'reached', reached: true, celebrated: false },
      { id: 'short', reached: false, celebrated: false },
      { id: 'celebrated', reached: true, celebrated: true },
    ],
  )
})
