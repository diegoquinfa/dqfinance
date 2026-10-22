import assert from 'node:assert/strict'
import { existsSync, readdirSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath, pathToFileURL, URL } from 'node:url'
import { getTableColumns, getTableName, isTable, type SQL } from 'drizzle-orm'
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core'

// The API's modules import each other without the extension, which Node ESM cannot resolve.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !/\.[cm]?[jt]sx?$/.test(specifier) && context.parentURL) {
      const url = new URL(`${specifier}.ts`, context.parentURL)
      if (existsSync(fileURLToPath(url))) return nextResolve(url.href, context)
    }
    return nextResolve(specifier, context)
  },
})

const { guestOwnedTables, moveGuestData } = await import('./move-guest-data.ts')

type Db = Parameters<typeof moveGuestData>[0]

type DrizzleTable = Parameters<typeof getTableName>[0]

type Statement = {
  kind: 'update' | 'delete'
  table: DrizzleTable
  values?: Record<string, unknown>
  where: SQL
}

/** The rows the fake database answers with, keyed by what the move asks for. */
type Fixture = {
  guest?: { id: string }
  settings?: string[]
  currencies?: { userId: string; code: string }[]
  systemCategories?: { id: string; userId: string; systemKey: string }[]
  budgets?: { userId: string; categoryId: string }[]
  pushSubscriptions?: { userId: string; endpoint: string }[]
}

const featuresDir = fileURLToPath(new URL('../', import.meta.url))

const dialect = new SQLiteSyncDialect()

/** The tables of the domain that carry a `user_id`: what a guest owns and must keep. */
async function ownedTableNames(): Promise<string[]> {
  const files = readdirSync(featuresDir, { recursive: true, encoding: 'utf8' }).filter((file) =>
    file.endsWith('.schema.ts'),
  )
  const names: string[] = []
  for (const file of files) {
    // Better Auth owns its own tables: the anonymous plugin links the session itself.
    if (file.replace(/\\/g, '/').startsWith('auth/')) continue
    const module = await import(pathToFileURL(join(featuresDir, file)).href)
    for (const value of Object.values(module)) {
      if (!isTable(value)) continue
      const columns = Object.values(getTableColumns(value))
      if (!columns.some((column) => column.name === 'user_id')) continue
      names.push(getTableName(value))
    }
  }
  return names.sort()
}

/** A read chain over canned rows, usable as both `await select` and `select.get()`. */
const read = <T>(rows: T[]) => ({
  get: async () => rows[0],
  then: (resolve: (rows: T[]) => unknown, reject?: (error: unknown) => unknown) =>
    Promise.resolve(rows).then(resolve, reject),
})

/** The fixture rows a `WHERE` clause asks for: every read filters by the user ids in it. */
function rowsFor(table: DrizzleTable, where: SQL, fixture: Fixture): object[] {
  const params = (dialect.sqlToQuery(where).params as string[]).map(String)
  switch (getTableName(table)) {
    case 'user':
      return fixture.guest ? [fixture.guest] : []
    case 'user_settings':
      return (fixture.settings ?? [])
        .filter((userId) => params.includes(userId))
        .map((userId) => ({ userId }))
    case 'user_currency':
      return (fixture.currencies ?? []).filter((row) => params.includes(row.userId))
    case 'category':
      return (fixture.systemCategories ?? []).filter((row) => params.includes(row.userId))
    case 'budget':
      return (fixture.budgets ?? []).filter((row) => params.includes(row.userId))
    case 'push_subscription':
      return (fixture.pushSubscriptions ?? []).filter((row) => params.includes(row.userId))
    default:
      return []
  }
}

/** A database that records the statements instead of running them. */
function recordingDb(fixture: Fixture) {
  const statements: Statement[] = []
  const batches: Statement[][] = []
  const db = {
    select: () => ({
      from: (table: DrizzleTable) => ({
        where: (where: SQL) => read(rowsFor(table, where, fixture)),
      }),
    }),
    update: (table: DrizzleTable) => ({
      set: (values: Record<string, unknown>) => ({
        where: (where: SQL) => {
          const statement: Statement = { kind: 'update', table, values, where }
          statements.push(statement)
          return statement
        },
      }),
    }),
    delete: (table: DrizzleTable) => ({
      where: (where: SQL) => {
        const statement: Statement = { kind: 'delete', table, where }
        statements.push(statement)
        return statement
      },
    }),
    batch: async (batch: Statement[]) => {
      batches.push(batch)
    },
  }
  return { db: db as unknown as Db, statements, batches }
}

const tableNameOf = (statement: Statement) => getTableName(statement.table)
const whereParams = (statement: Statement) => dialect.sqlToQuery(statement.where).params

test('every table with a user_id moves with the guest', async () => {
  const moved = guestOwnedTables.map((table) => getTableName(table)).sort()
  assert.deepEqual(moved, await ownedTableNames())
})

test('the move touches only the rows the guest still owns', async () => {
  const { db, statements, batches } = recordingDb({ guest: { id: 'guest-1' } })
  await moveGuestData(db, 'guest-1', 'account-1')

  assert.equal(statements.length, guestOwnedTables.length)
  // One batch, so the ledger moves whole or not at all.
  assert.deepEqual(
    batches.map((batch) => batch.length),
    [guestOwnedTables.length],
  )
  for (const statement of statements) {
    assert.equal(statement.values!.userId, 'account-1')
    assert.deepEqual(dialect.sqlToQuery(statement.where).params, ['guest-1'])
  }
})

test('a second call moves nothing: the guest is already gone', async () => {
  const { db, statements } = recordingDb({})
  await moveGuestData(db, 'guest-1', 'account-1')

  assert.equal(statements.length, 0)
})

test('a guest from before the anonymous flag existed still moves its ledger', async () => {
  // The flag is not the guard: a guest without it must not lose its ledger on sign-up.
  const { db, statements } = recordingDb({ guest: { id: 'guest-1' } })
  await moveGuestData(db, 'guest-1', 'account-1')

  assert.equal(statements.length, guestOwnedTables.length)
})

test('signing into an account that owns the same unique rows: the target keeps them', async () => {
  const keys = ['fx_loss', 'fx_gain', 'bank_fees', 'other_expense', 'other_income']
  const { db, statements, batches } = recordingDb({
    guest: { id: 'guest-1' },
    settings: ['guest-1', 'account-1'],
    currencies: [
      { userId: 'guest-1', code: 'COP' },
      { userId: 'guest-1', code: 'USD' },
      { userId: 'account-1', code: 'COP' },
    ],
    systemCategories: keys.flatMap((systemKey) => [
      { id: `guest-${systemKey}`, userId: 'guest-1', systemKey },
      { id: `account-${systemKey}`, userId: 'account-1', systemKey },
    ]),
    budgets: [
      { userId: 'account-1', categoryId: 'account-fx_loss' },
      { userId: 'guest-1', categoryId: 'guest-fx_loss' },
      { userId: 'guest-1', categoryId: 'guest-other_expense' },
    ],
  })

  await moveGuestData(db, 'guest-1', 'account-1')

  const deletes = statements.filter((statement) => statement.kind === 'delete')
  const updates = statements.filter((statement) => statement.kind === 'update')

  // The target's row wins: the guest's settings, its shared COP, and its system categories go.
  assert.deepEqual(
    deletes.map(tableNameOf).sort(),
    [
      'category',
      'category',
      'category',
      'category',
      'category',
      'user_currency',
      'user_settings',
    ],
  )
  assert.ok(deletes.every((statement) => whereParams(statement).includes('guest-1')))
  const currencyDelete = deletes.find((statement) => tableNameOf(statement) === 'user_currency')!
  assert.deepEqual(whereParams(currencyDelete), ['guest-1', 'COP'])

  // Ledger rows on a dropped category point at the target's copy of the same key first.
  const repointed = updates.filter((statement) =>
    String(statement.values?.categoryId ?? '').startsWith('account-'),
  )
  assert.equal(repointed.length, 3 * keys.length - 1)
  // The guest's fx_loss budget goes with the category: the target already budgets its copy.
  const budgetRepoints = repointed.filter((statement) => tableNameOf(statement) === 'budget')
  assert.equal(budgetRepoints.length, keys.length - 1)
  assert.ok(!budgetRepoints.some((statement) => statement.values?.categoryId === 'account-fx_loss'))
  assert.ok(budgetRepoints.some((statement) => statement.values?.categoryId === 'account-other_expense'))

  // Every other table still moves.
  const moves = updates.filter((statement) => statement.values?.userId === 'account-1')
  assert.equal(moves.length, guestOwnedTables.length)
  for (const statement of moves) assert.deepEqual(whereParams(statement), ['guest-1'])

  // Every reference is re-pointed before the category it pointed at is dropped.
  for (const drop of deletes.filter((statement) => tableNameOf(statement) === 'category')) {
    const guestId = String(whereParams(drop)[1])
    const references = statements.filter(
      (statement) => statement.kind === 'update' && whereParams(statement).includes(guestId),
    )
    assert.ok(references.length > 0)
    for (const reference of references) {
      assert.ok(statements.indexOf(reference) < statements.indexOf(drop))
    }
  }

  // All of it in one batch, with the deletes ahead of the moves that would collide.
  assert.deepEqual(
    batches.map((batch) => batch.length),
    [statements.length],
  )
  for (const drop of deletes) assert.ok(statements.indexOf(drop) < statements.indexOf(moves[0]!))
})

test('target already owns the same push endpoint: the guest duplicate is dropped', async () => {
  const shared = 'https://push.example/both'
  const guestOnly = 'https://push.example/guest-only'
  const { db, statements, batches } = recordingDb({
    guest: { id: 'guest-1' },
    pushSubscriptions: [
      { userId: 'guest-1', endpoint: shared },
      { userId: 'guest-1', endpoint: guestOnly },
      { userId: 'account-1', endpoint: shared },
    ],
  })

  await moveGuestData(db, 'guest-1', 'account-1')

  const deletes = statements.filter((statement) => statement.kind === 'delete')
  const drops = deletes.filter((statement) => tableNameOf(statement) === 'push_subscription')
  const move = statements.find(
    (statement) =>
      statement.kind === 'update' &&
      statement.values?.userId === 'account-1' &&
      tableNameOf(statement) === 'push_subscription',
  )!

  // The target's row wins for the shared endpoint; the guest-only endpoint is not dropped.
  assert.equal(drops.length, 1)
  assert.deepEqual(whereParams(drops[0]!), ['guest-1', shared])
  // The guest's row for the guest-only endpoint still moves.
  assert.deepEqual(whereParams(move), ['guest-1'])
  // The duplicate goes before the move that would collide on the unique endpoint.
  assert.ok(statements.indexOf(drops[0]!) < statements.indexOf(move))

  // Both in the same batch, whole or not at all.
  assert.deepEqual(
    batches.map((batch) => batch.length),
    [statements.length],
  )
})
