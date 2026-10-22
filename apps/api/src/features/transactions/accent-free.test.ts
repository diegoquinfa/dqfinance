import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { sql } from 'drizzle-orm'
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core'
import { accentFree, accentFreeSql } from './accent-free.ts'

const dialect = new SQLiteSyncDialect()

/** A real SQLite table, so the folded expression is proven by a query and not by reading the code. */
const table = (...titles: string[]) => {
  const db = new DatabaseSync(':memory:')
  db.exec('create table movement (title text)')
  for (const title of titles) db.prepare('insert into movement (title) values (?)').run(title)
  return db
}

const matches = (db: DatabaseSync, typed: string) => {
  const query = dialect.sqlToQuery(
    sql`select count(*) as n from movement where ${accentFreeSql(sql.raw('title'))} like ${`%${accentFree(typed)}%`}`,
  )
  return (db.prepare(query.sql).get(...(query.params as string[])) as { n: number }).n
}

/** The stored side of the comparison, folded by the real SQL, one row per value. */
const foldedInSql = (values: string[]) => {
  const db = table(...values)
  const query = dialect.sqlToQuery(
    sql`select ${accentFreeSql(sql.raw('title'))} as folded from movement order by rowid`,
  )
  return db.prepare(query.sql).all().map((row) => (row as { folded: string }).folded)
}

test('the typed word loses its diacritics', () => {
  assert.equal(accentFree('Educación'), 'educacion')
  assert.equal(accentFree('CAFETERÍA'), 'cafeteria')
  assert.equal(accentFree('Niño'), 'nino')
  assert.equal(accentFree('São Paulo'), 'sao paulo')
  assert.equal(accentFree('EDUCACIÓN'), 'educacion')
  assert.equal(accentFree('Škoda'), 'Škoda')
  assert.equal(accentFree('plain'), 'plain')
})

test('a word typed without accents finds the accented movement', () => {
  const db = table('Educación', 'CAFETERÍA', 'Café Ñandú', 'Niño')
  assert.equal(matches(db, 'educacion'), 1)
  assert.equal(matches(db, 'cafeteria'), 1)
  assert.equal(matches(db, 'nandu'), 1)
  assert.equal(matches(db, 'nino'), 1)
  assert.equal(matches(db, 'EDUCACIÓN'), 1)
})

test('the accent still has to be in the same place', () => {
  const db = table('Educación')
  assert.equal(matches(db, 'educasion'), 0)
  assert.equal(matches(db, 'cafe'), 0)
})

test('a letter without a table entry keeps the case it was typed in', () => {
  const db = table('Škoda servis', 'Žižek', 'Łódź')
  assert.equal(matches(db, 'Škoda'), 1)
  assert.equal(matches(db, 'ŠKODA'), 1)
  assert.equal(matches(db, 'Žižek'), 1)
  assert.equal(matches(db, 'Łódź'), 1)
  // The stored "Š" never folds, and LIKE folds ASCII case only, so the lower-case "š" is a miss.
  // shortcut: an out-of-table letter matches only in the case it was stored; widen the table then.
  assert.equal(matches(db, 'škoda'), 0)
  // The mirror of the same limit: a stored lower-case "š" does not meet a typed "Š".
  assert.equal(matches(table('škoda servis'), 'Škoda'), 0)
})

test('the JS fold and the SQL fold agree letter by letter', () => {
  const latin1AndExtended = Array.from({ length: 0x250 - 0xc0 }, (_, i) =>
    String.fromCodePoint(0xc0 + i),
  )
  const withoutEntry = ['Š', 'š', 'Ž', 'ž', 'Ł', 'ł', 'Ș', 'ș', 'İ', 'ı', 'ẞ']
  const stored = [...latin1AndExtended, ...withoutEntry, 'Škoda servis', 'Žižek', 'Łódź', 'EDUCACIÓN']
  assert.deepEqual(foldedInSql(stored), stored.map(accentFree))
})

test('a word without accents is still found as it is', () => {
  const db = table('Mercado del barrio')
  assert.equal(matches(db, 'mercado'), 1)
  assert.equal(matches(db, 'MERCADO'), 1)
  assert.equal(matches(db, 'farmacia'), 0)
})
