import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cardDebtOf, computeBalances, currentBalanceOf, type Ledger } from './compute-balances.ts'

const none = { productId: null, cashWalletId: null, cardId: null }
const transferBase = {
  fromProductId: null,
  fromCashWalletId: null,
  toProductId: null,
  toCashWalletId: null,
  toCardId: null,
  costBasisCents: null,
  receivedAt: new Date(),
}

const ledger = (overrides: Partial<Ledger>): Ledger => ({
  products: [
    { id: 'savings', name: 'Savings', bankName: 'Bank A', currency: 'COP' },
    { id: 'other', name: 'Other', bankName: 'Bank B', currency: 'COP' },
  ],
  cashWallets: [{ id: 'wallet', name: 'Wallet', currency: 'COP' }],
  cards: [
    { id: 'debit', name: 'Debit', kind: 'debit', productId: 'savings', currency: 'COP', creditLimitCents: null },
    { id: 'visa', name: 'Visa', kind: 'credit', productId: 'savings', currency: 'COP', creditLimitCents: 1_000_000_00 },
  ],
  transactions: [],
  transfers: [],
  adjustments: [],
  ...overrides,
})

test('product balance = income − expense (incl. debit card) − sent + received + adjustments', () => {
  const balances = computeBalances(
    ledger({
      transactions: [
        { ...none, type: 'income', amountCents: 100_000, currency: 'COP', primaryAmountCents: null, productId: 'savings' },
        { ...none, type: 'expense', amountCents: 20_000, currency: 'COP', primaryAmountCents: null, cardId: 'debit' },
      ],
      transfers: [
        { ...transferBase, fromProductId: 'savings', toCashWalletId: 'wallet', sentAmountCents: 30_000, sentCurrency: 'COP', receivedAmountCents: 30_000, receivedCurrency: 'COP' },
        { ...transferBase, fromProductId: 'other', toProductId: 'savings', sentAmountCents: 5_000, sentCurrency: 'COP', receivedAmountCents: 5_000, receivedCurrency: 'COP' },
      ],
      adjustments: [{ ...none, productId: 'savings', currency: 'COP', deltaCents: -1_000 }],
    }),
  )
  assert.equal(currentBalanceOf(balances, { type: 'product', id: 'savings' }, 'COP'), 100_000 - 20_000 - 30_000 + 5_000 - 1_000)
  assert.equal(currentBalanceOf(balances, { type: 'cash_wallet', id: 'wallet' }, 'COP'), 30_000)
  assert.equal(currentBalanceOf(balances, { type: 'product', id: 'other' }, 'COP'), -5_000)
})

test('a transfer in transit leaves the origin but does not reach the destination yet', () => {
  const balances = computeBalances(
    ledger({
      transfers: [
        { ...transferBase, receivedAt: null, fromProductId: 'savings', toProductId: 'other', sentAmountCents: 40_000, sentCurrency: 'COP', receivedAmountCents: 40_000, receivedCurrency: 'COP' },
      ],
    }),
  )
  assert.equal(currentBalanceOf(balances, { type: 'product', id: 'savings' }, 'COP'), -40_000)
  assert.equal(currentBalanceOf(balances, { type: 'product', id: 'other' }, 'COP'), 0)
  assert.deepEqual(balances.inTransit, [{ currency: 'COP', amountCents: 40_000 }])
})

test('credit card keeps debt per currency, valued at purchase-day cost, and leaves the product untouched', () => {
  const balances = computeBalances(
    ledger({
      transactions: [
        { ...none, type: 'expense', amountCents: 10_000_00, currency: 'COP', primaryAmountCents: null, cardId: 'visa' },
        { ...none, type: 'expense', amountCents: 5_00, currency: 'USD', primaryAmountCents: 20_000_00, cardId: 'visa' },
        { ...none, type: 'expense', amountCents: 5_00, currency: 'USD', primaryAmountCents: 22_000_00, cardId: 'visa' },
        // FX loss linked to the payment below: it carries what was paid above the cost basis.
        { ...none, type: 'expense', amountCents: 200_00, currency: 'COP', primaryAmountCents: null, productId: 'savings' },
      ],
      transfers: [
        // Paid 4 USD with 17,000 COP: 16,800 of cost basis moves as the transfer, 200 is the FX loss.
        { ...transferBase, fromProductId: 'savings', toCardId: 'visa', sentAmountCents: 16_800_00, sentCurrency: 'COP', receivedAmountCents: 4_00, receivedCurrency: 'USD', costBasisCents: 16_800_00 },
      ],
    }),
  )
  const visa = balances.creditCards[0]!
  assert.deepEqual(cardDebtOf(balances, 'visa', 'USD'), { units: 6_00, basis: 25_200_00 })
  assert.deepEqual(cardDebtOf(balances, 'visa', 'COP'), { units: 10_000_00, basis: 10_000_00 })
  assert.equal(visa.totalCents, 10_000_00 + 25_200_00)
  assert.equal(visa.availableCents, 1_000_000_00 - visa.totalCents)
  assert.equal(currentBalanceOf(balances, { type: 'product', id: 'savings' }, 'COP'), -17_000_00)
})

test('a fully paid currency disappears from the card debts', () => {
  const balances = computeBalances(
    ledger({
      transactions: [{ ...none, type: 'expense', amountCents: 50_000, currency: 'COP', primaryAmountCents: null, cardId: 'visa' }],
      transfers: [
        { ...transferBase, fromProductId: 'savings', toCardId: 'visa', sentAmountCents: 50_000, sentCurrency: 'COP', receivedAmountCents: 50_000, receivedCurrency: 'COP' },
      ],
    }),
  )
  assert.deepEqual(balances.creditCards[0]!.debts, [])
  assert.equal(balances.creditCards[0]!.totalCents, 0)
})
