import assert from 'node:assert/strict'
import { test } from 'node:test'
import { budgetMerge, mergeBlock } from './category-merge-rules.ts'

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

test('the source budget moves when the target has none', () => {
  assert.equal(budgetMerge(true, false), 'move')
})

test('the target budget wins when both categories have one', () => {
  assert.equal(budgetMerge(true, true), 'drop')
})

test('a source without a budget leaves nothing to move or drop', () => {
  assert.equal(budgetMerge(false, false), 'none')
  assert.equal(budgetMerge(false, true), 'none')
})
