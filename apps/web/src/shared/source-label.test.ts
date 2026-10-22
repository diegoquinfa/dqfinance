import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceLabel } from './source-label.ts'

test('a source with a bank leads with it', () => {
  assert.equal(sourceLabel({ name: 'Principal', bankName: 'Bancolombia' }), 'Bancolombia · Principal')
})

test('a cash wallet shows its own name', () => {
  assert.equal(sourceLabel({ name: 'Billetera', bankName: null }), 'Billetera')
})
