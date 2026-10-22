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

type Statement = { table: unknown; values: Record<string, unknown>; where: SQL }

const featuresDir = fileURLToPath(new URL('../', import.meta.url))

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

/** A database that records the statements instead of running them. */
function recordingDb(guest: { id: string } | undefined) {
  const statements: Statement[] = []
  const batches: Statement[][] = []
  const db = {
    select: () => ({ from: () => ({ where: () => ({ get: async () => guest }) }) }),
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: (where: SQL) => {
          const statement = { table, values, where }
          statements.push(statement)
          return statement
        },
      }),
    }),
    batch: async (batch: Statement[]) => {
      batches.push(batch)
    },
  }
  return { db: db as unknown as Db, statements, batches }
}

const dialect = new SQLiteSyncDialect()

test('every table with a user_id moves with the guest', async () => {
  const moved = guestOwnedTables.map((table) => getTableName(table)).sort()
  assert.deepEqual(moved, await ownedTableNames())
})

test('the move touches only the rows the guest still owns', async () => {
  const { db, statements, batches } = recordingDb({ isAnonymous: true })
  await moveGuestData(db, 'guest-1', 'account-1')

  assert.equal(statements.length, guestOwnedTables.length)
  // One batch, so the ledger moves whole or not at all.
  assert.deepEqual(
    batches.map((batch) => batch.length),
    [guestOwnedTables.length],
  )
  for (const statement of statements) {
    assert.equal(statement.values.userId, 'account-1')
    assert.deepEqual(dialect.sqlToQuery(statement.where).params, ['guest-1'])
  }
})

test('a second call moves nothing: the guest is already gone', async () => {
  const { db, statements } = recordingDb(undefined)
  await moveGuestData(db, 'guest-1', 'account-1')

  assert.equal(statements.length, 0)
})

test('a guest from before the anonymous flag existed still moves its ledger', async () => {
  // The flag is not the guard: a guest without it must not lose its ledger on sign-up.
  const { db, statements } = recordingDb({ id: 'guest-1' })
  await moveGuestData(db, 'guest-1', 'account-1')

  assert.equal(statements.length, guestOwnedTables.length)
})
