import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mergeBlock } from './category-merge-rules.ts'

const expense = { id: 'a', kind: 'expense' } as const
const income = { id: 'b', kind: 'income' } as const

test('a category merges into another of the same kind', () => {
  assert.equal(mergeBlock(expense, { id: 'c', kind: 'expense' }), null)
})

test('a category cannot merge into itself', () => {
  assert.equal(mergeBlock(expense, expense), 'same')
})

test('an expense category does not merge into an income one', () => {
  assert.equal(mergeBlock(expense, income), 'kind')
})
