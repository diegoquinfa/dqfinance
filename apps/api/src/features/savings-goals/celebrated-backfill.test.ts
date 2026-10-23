import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { seedCardUser, USER_ID } from '../../test/seed.ts'
import '../../test/ts-imports.ts'

const migrations = fileURLToPath(new URL('../../../migrations/', import.meta.url).href)

test('the migration marks the goals already reached as celebrated, and leaves the rest', () => {
  // Applies every migration before the one that adds the column, seeds the goals as they were, then runs that migration.
  const files = readdirSync(migrations).filter((name) => name.endsWith('.sql')).sort()
  const read = (name: string) => readFileSync(join(migrations, name), 'utf8')
  const addColumn = files.findIndex((name) => read(name).includes('ADD `celebrated_at`'))
  assert.notEqual(addColumn, -1)
  const sqlite = new DatabaseSync(':memory:')
  for (const name of files.slice(0, addColumn)) sqlite.exec(read(name))
  sqlite.exec('PRAGMA foreign_keys = ON')
  seedCardUser(sqlite)
  sqlite.prepare(`INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES ('user-2', 'Ben', 'ben@example.com', 1, 1, 1)`).run()
  const seedGoal = (id: string, userId: string, targetCents: number) =>
    sqlite.prepare('INSERT INTO savings_goal (id, user_id, name, target_cents, currency, active) VALUES (?, ?, ?, ?, ?, 1)').run(id, userId, id, targetCents, 'COP')
  const contribute = (goalId: string, userId: string, amountCents: number) =>
    sqlite
      .prepare('INSERT INTO savings_contribution (id, user_id, goal_id, amount_cents, contributed_on) VALUES (?, ?, ?, ?, ?)')
      .run(`${goalId}-${userId}-${amountCents}`, userId, goalId, amountCents, '2026-10-01')
  // Reached by two payments that add up to the target.
  seedGoal('reached', USER_ID, 100_000)
  contribute('reached', USER_ID, 60_000)
  contribute('reached', USER_ID, 40_000)
  // Short by one cent.
  seedGoal('unreached', USER_ID, 100_000)
  contribute('unreached', USER_ID, 99_999)
  // Nothing put in yet.
  seedGoal('empty', USER_ID, 50_000)
  // Its target is met only with another user's money, which does not count toward it.
  seedGoal('others-money', USER_ID, 10_000)
  contribute('others-money', 'user-2', 10_000)

  const before = Date.now()
  sqlite.exec(read(files[addColumn]!))
  const after = Date.now()

  const rows = sqlite.prepare('SELECT id, celebrated_at AS at FROM savings_goal ORDER BY id').all() as { id: string; at: number | null }[]
  assert.deepEqual(rows.map((row) => row.id), ['empty', 'others-money', 'reached', 'unreached'])
  const reached = rows.find((row) => row.id === 'reached')?.at
  assert.ok(reached !== null && reached !== undefined && before <= reached && reached <= after)
  assert.deepEqual(
    rows.filter((row) => row.id !== 'reached').map((row) => row.at),
    [null, null, null],
  )
})
