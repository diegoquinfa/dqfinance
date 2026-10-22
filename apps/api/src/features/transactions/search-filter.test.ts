import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SQLiteSyncDialect, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { searchFilter } from './search-filter.ts'

// The three fields a movement is searched by, as a table so the columns are real ones.
const movement = sqliteTable('movement', {
  title: text('title'),
  description: text('description'),
  category: text('category'),
})

const fields = {
  title: movement.title,
  description: movement.description,
  category: movement.category,
}

const dialect = new SQLiteSyncDialect()

test('a query of no words does not filter anything', () => {
  assert.equal(searchFilter([], fields), undefined)
})

test('a word is looked for in the three fields, as a parameter', () => {
  const query = dialect.sqlToQuery(searchFilter(['web'], fields)!)
  assert.deepEqual(query.params, ['%web%', '%web%', '%web%'])
})

test('every word must appear', () => {
  const query = dialect.sqlToQuery(searchFilter(['web', 'sunday'], fields)!)
  assert.deepEqual(query.params, ['%web%', '%web%', '%web%', '%sunday%', '%sunday%', '%sunday%'])
})
