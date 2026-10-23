import assert from 'node:assert/strict'
import { test } from 'node:test'
import { openTestDb } from '../../test/fake-d1.ts'
import { seedCardUser, USER_ID } from '../../test/seed.ts'
import '../../test/ts-imports.ts'

const { createDb } = await import('../../db.ts')
const { createWebhook, WEBHOOK_LIMIT } = await import('./webhooks.ts')

const hookInput = (n: number) => ({ url: `https://hook-${n}.example.com/dqfinance`, secret: `secret-number-${n}-0000` })

const countHooks = (sqlite: ReturnType<typeof openTestDb>['sqlite'], userId: string) =>
  (sqlite.prepare('SELECT count(*) AS n FROM webhook WHERE user_id = ?').get(userId) as { n: number }).n

test('the tenth hook is saved, and the eleventh is refused with webhook_limit', async () => {
  const { sqlite, d1 } = openTestDb()
  seedCardUser(sqlite)
  const db = createDb(d1)
  assert.equal(WEBHOOK_LIMIT, 10)

  for (let n = 1; n < WEBHOOK_LIMIT; n++) await createWebhook(db, USER_ID, hookInput(n))
  const tenth = await createWebhook(db, USER_ID, hookInput(WEBHOOK_LIMIT))
  assert.equal(tenth.url, hookInput(WEBHOOK_LIMIT).url)
  assert.equal(countHooks(sqlite, USER_ID), WEBHOOK_LIMIT)

  await assert.rejects(createWebhook(db, USER_ID, hookInput(WEBHOOK_LIMIT + 1)), { code: 'webhook_limit', status: 409 })
  assert.equal(countHooks(sqlite, USER_ID), WEBHOOK_LIMIT)
})

test('a guest cannot save a hook', async () => {
  const { sqlite, d1 } = openTestDb()
  sqlite
    .prepare(`INSERT INTO user (id, name, email, email_verified, is_anonymous, created_at, updated_at) VALUES ('guest-1', 'Guest', 'guest@example.test', 0, 1, 1, 1)`)
    .run()

  await assert.rejects(createWebhook(createDb(d1), 'guest-1', hookInput(1)), { code: 'guest_not_allowed', status: 403 })
  assert.equal(countHooks(sqlite, 'guest-1'), 0)
})
