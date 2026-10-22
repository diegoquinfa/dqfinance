import assert from 'node:assert/strict'
import { test } from 'node:test'
import { searchTerms } from './search-terms.ts'

test('the words of a query are kept in the order they were typed', () => {
  assert.deepEqual(searchTerms('Web Sunday'), ['Web', 'Sunday'])
})

test('filler is dropped, so a phrase finds the movement too', () => {
  assert.deepEqual(searchTerms('expenses at Web Sunday'), ['Web', 'Sunday'])
  assert.deepEqual(searchTerms('gastos en la cafetería'), ['cafetería'])
})

test('punctuation splits words and never reaches the query', () => {
  assert.deepEqual(searchTerms('web-sunday'), ['web', 'sunday'])
  assert.deepEqual(searchTerms("100% 'web'"), ['100', 'web'])
})

test('a query of only filler words matches everything', () => {
  assert.deepEqual(searchTerms('the expenses'), [])
  assert.deepEqual(searchTerms('   '), [])
})

test('a single letter is not a word', () => {
  assert.deepEqual(searchTerms('a web'), ['web'])
})
