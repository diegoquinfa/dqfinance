import assert from 'node:assert/strict'
import { test } from 'node:test'
import { toCategory } from './category-payload.ts'

test('a system category carries its key and its translated name', () => {
  const category = toCategory({ id: 'sys', kind: 'expense', name: null, systemKey: 'bank_fees' }, 'es')
  assert.deepEqual(category, { id: 'sys', kind: 'expense', name: 'Comisiones bancarias', systemKey: 'bank_fees' })
})

test('a user category has no system key and keeps its own name', () => {
  const category = toCategory({ id: 'own', kind: 'expense', name: 'Rent', systemKey: null }, 'en')
  assert.deepEqual(category, { id: 'own', kind: 'expense', name: 'Rent', systemKey: null })
})
