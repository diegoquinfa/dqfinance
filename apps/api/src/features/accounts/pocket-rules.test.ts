import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cardProductError, pocketCreateError, pocketUpdateError, type PocketParent } from './pocket-rules.ts'

const parent: PocketParent = { id: 'savings', type: 'savings', currency: 'COP', bankAccountId: 'account-1' }
const create = (overrides: Partial<Parameters<typeof pocketCreateError>[0]> = {}) => ({
  type: 'pocket',
  currency: 'COP',
  bankAccountId: 'account-1',
  parentProductId: 'savings',
  ...overrides,
})

test('a pocket needs a parent product', () => {
  assert.equal(pocketCreateError(create({ parentProductId: null }), null), 'pocket_parent_required')
  assert.equal(pocketCreateError(create({ parentProductId: undefined }), null), 'pocket_parent_required')
})

test('only a pocket has a parent product', () => {
  assert.equal(pocketCreateError(create({ type: 'savings' }), parent), 'pocket_type_required')
  assert.equal(pocketCreateError(create({ type: 'savings' }), null), 'pocket_type_required')
})

test('a parent product the user does not own is not found', () => {
  assert.equal(pocketCreateError(create(), null), 'product_not_found')
})

test('a parent product must live in the same bank account', () => {
  assert.equal(pocketCreateError(create(), { ...parent, bankAccountId: 'account-2' }), 'pocket_parent_invalid')
})

test('a pocket of a pocket is not allowed', () => {
  assert.equal(pocketCreateError(create(), { ...parent, type: 'pocket' }), 'pocket_parent_invalid')
})

test('a pocket and its parent use the same currency', () => {
  assert.equal(pocketCreateError(create({ currency: 'USD' }), parent), 'pocket_currency_mismatch')
})

test('a pocket with a valid parent is accepted', () => {
  assert.equal(pocketCreateError(create(), parent), null)
})

test('a product without a parent is accepted', () => {
  assert.equal(pocketCreateError(create({ type: 'savings', parentProductId: null }), null), null)
})

test('a pocket keeps its type and a product never becomes one', () => {
  assert.equal(pocketUpdateError({ type: 'pocket', currency: 'COP' }, { type: 'savings' }, false), 'pocket_type_locked')
  assert.equal(pocketUpdateError({ type: 'savings', currency: 'COP' }, { type: 'pocket' }, false), 'pocket_type_locked')
  assert.equal(pocketUpdateError({ type: 'pocket', currency: 'COP' }, { type: 'pocket' }, false), null)
  assert.equal(pocketUpdateError({ type: 'savings', currency: 'COP' }, { type: 'checking' }, false), null)
})

test('a pocket and a product with pockets keep their currency', () => {
  assert.equal(pocketUpdateError({ type: 'pocket', currency: 'COP' }, { currency: 'USD' }, false), 'pocket_currency_mismatch')
  assert.equal(pocketUpdateError({ type: 'savings', currency: 'COP' }, { currency: 'USD' }, true), 'pocket_currency_mismatch')
  assert.equal(pocketUpdateError({ type: 'savings', currency: 'COP' }, { currency: 'USD' }, false), null)
})

test('a pocket has no cards', () => {
  assert.equal(cardProductError('pocket'), 'card_on_pocket')
  assert.equal(cardProductError('savings'), null)
})
