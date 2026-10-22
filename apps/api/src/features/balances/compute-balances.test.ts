import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assetsAndLiabilities, cardDebtOf, computeBalances, computeBalancesAt, currentBalanceOf, monthEnds, type Ledger, type LedgerPoint } from './compute-balances.ts'

// Source columns plus the date each movement row carries; only computeBalancesAt reads the date.
const none = { productId: null, cashWalletId: null, cardId: null, occurredAt: new Date(), adjustedAt: new Date() }
const at = (iso: string) => new Date(iso)
const transferBase = {
  fromProductId: null,
  fromCashWalletId: null,
  toProductId: null,
  toCashWalletId: null,
  toCardId: null,
  costBasisCents: null,
  sentAt: new Date(),
  receivedAt: new Date(),
}

const ledger = (overrides: Partial<Ledger>): Ledger => ({
  products: [
    { id: 'savings', name: 'Savings', bankName: 'Bank A', currency: 'COP', annualRateBps: 900, yieldPayout: 'monthly' },
    { id: 'other', name: 'Other', bankName: 'Bank B', currency: 'COP', annualRateBps: null, yieldPayout: null },
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
      transactions: [{ ...none, type: 'expense', amountCents: 50_000, currency: 'COP', primaryAmountCents: null, cardId: 'visa', occurredAt: new Date() }],
      transfers: [
        { ...transferBase, fromProductId: 'savings', toCardId: 'visa', sentAmountCents: 50_000, sentCurrency: 'COP', receivedAmountCents: 50_000, receivedCurrency: 'COP' },
      ],
    }),
  )
  assert.deepEqual(balances.creditCards[0]!.debts, [])
  assert.equal(balances.creditCards[0]!.totalCents, 0)
})

const foreignDebtLedger = (overrides: Partial<Ledger> = {}): Ledger =>
  ledger({
    // 100 USD bought at 4,000 COP: the card owes 400,000 COP for it.
    transactions: [{ ...none, type: 'expense', amountCents: 100_00, currency: 'USD', primaryAmountCents: 400_000_00, cardId: 'visa' }],
    ...overrides,
  })

test('an adjustment on foreign debt scales the cost basis at the average purchase rate', () => {
  const balances = computeBalances(
    foreignDebtLedger({ adjustments: [{ ...none, cardId: 'visa', currency: 'USD', deltaCents: 50_00 }] }),
  )
  assert.deepEqual(cardDebtOf(balances, 'visa', 'USD'), { units: 150_00, basis: 600_000_00 })
  // The card total is in COP: the 50 USD added are worth 200,000 COP, not 0 and not 50 COP.
  assert.equal(balances.creditCards[0]!.totalCents, 600_000_00)
})

test('a payment adjustment lowers the foreign units and the cost basis in the same proportion', () => {
  const balances = computeBalances(
    foreignDebtLedger({ adjustments: [{ ...none, cardId: 'visa', currency: 'USD', deltaCents: -50_00 }] }),
  )
  assert.deepEqual(cardDebtOf(balances, 'visa', 'USD'), { units: 50_00, basis: 200_000_00 })
  assert.equal(balances.creditCards[0]!.totalCents, 200_000_00)
})

test('an adjustment in the card own currency keeps counting at nominal value', () => {
  const balances = computeBalances(
    ledger({
      transactions: [{ ...none, type: 'expense', amountCents: 100_000_00, currency: 'COP', primaryAmountCents: null, cardId: 'visa' }],
      adjustments: [{ ...none, cardId: 'visa', currency: 'COP', deltaCents: 50_000_00 }],
    }),
  )
  assert.deepEqual(cardDebtOf(balances, 'visa', 'COP'), { units: 150_000_00, basis: 150_000_00 })
  assert.equal(balances.creditCards[0]!.debts[0]!.costBasisCents, null)
  assert.equal(balances.creditCards[0]!.totalCents, 150_000_00)
})

test('an adjustment in a currency with no debt yet has no rate to apply and stays in its own currency', () => {
  const balances = computeBalances(
    ledger({
      transactions: [{ ...none, type: 'expense', amountCents: 100_000_00, currency: 'COP', primaryAmountCents: null, cardId: 'visa' }],
      adjustments: [{ ...none, cardId: 'visa', currency: 'USD', deltaCents: 50_00 }],
    }),
  )
  // Without a rate the USD debt is recorded as USD, with no cost basis: it is never mixed into the COP total.
  assert.deepEqual(cardDebtOf(balances, 'visa', 'USD'), { units: 50_00, basis: 0 })
  assert.equal(balances.creditCards[0]!.totalCents, 100_000_00)
})

const historyLedger = (overrides: Partial<LedgerPoint> = {}): LedgerPoint => ({
  ...ledger({
    transactions: [
      // January: the salary lands and a USD charge hits the credit card.
      { ...none, type: 'income', amountCents: 1_000_000, currency: 'COP', primaryAmountCents: null, productId: 'savings', occurredAt: at('2026-01-15T12:00:00Z') },
      { ...none, type: 'expense', amountCents: 50_00, currency: 'USD', primaryAmountCents: 200_000, cardId: 'visa', occurredAt: at('2026-01-20T12:00:00Z') },
      // February: rent leaves the savings account.
      { ...none, type: 'expense', amountCents: 300_000, currency: 'COP', primaryAmountCents: null, productId: 'savings', occurredAt: at('2026-02-10T12:00:00Z') },
    ],
  }),
  at: at('2026-03-31T23:59:59Z'),
  ...overrides,
})

test('a balance point only counts the movements dated on or before it', () => {
  const point = historyLedger({})
  const january = computeBalancesAt({ ...point, at: at('2026-01-31T23:59:59Z') })
  const february = computeBalancesAt({ ...point, at: at('2026-02-28T23:59:59Z') })

  assert.equal(currentBalanceOf(january, { type: 'product', id: 'savings' }, 'COP'), 1_000_000)
  assert.equal(currentBalanceOf(february, { type: 'product', id: 'savings' }, 'COP'), 700_000)
  // A month-end point sees its own month's last day and never looks ahead to the next month.
  assert.deepEqual(assetsAndLiabilities(january), [{ currency: 'COP', assetsCents: 1_000_000, liabilitiesCents: 200_000 }])
})

test('the foreign card charge counts at its purchase-day cost from its own month on', () => {
  const point = historyLedger({})
  assert.deepEqual(assetsAndLiabilities(computeBalancesAt({ ...point, at: at('2026-01-20T11:59:59Z') })), [
    { currency: 'COP', assetsCents: 1_000_000, liabilitiesCents: 0 },
  ])
  assert.deepEqual(assetsAndLiabilities(computeBalancesAt({ ...point, at: at('2026-01-20T12:00:00Z') })), [
    { currency: 'COP', assetsCents: 1_000_000, liabilitiesCents: 200_000 },
  ])
})

test('a transfer in transit shows at the month-end it was sent in, before the destination receives it', () => {
  const point = historyLedger({
    transfers: [
      {
        ...transferBase,
        fromProductId: 'savings',
        toProductId: 'other',
        sentAmountCents: 100_000,
        sentCurrency: 'COP',
        receivedAmountCents: 100_000,
        receivedCurrency: 'COP',
        sentAt: at('2026-02-27T12:00:00Z'),
        receivedAt: at('2026-03-02T12:00:00Z'),
      },
    ],
  })
  const february = computeBalancesAt({ ...point, at: at('2026-02-28T23:59:59Z') })
  const march = computeBalancesAt({ ...point, at: at('2026-03-31T23:59:59Z') })

  assert.equal(currentBalanceOf(february, { type: 'product', id: 'savings' }, 'COP'), 700_000 - 100_000)
  assert.equal(currentBalanceOf(february, { type: 'product', id: 'other' }, 'COP'), 0)
  assert.deepEqual(february.inTransit, [{ currency: 'COP', amountCents: 100_000 }])
  assert.equal(currentBalanceOf(march, { type: 'product', id: 'other' }, 'COP'), 100_000)
  assert.deepEqual(march.inTransit, [])
})

test('a product carries its rate into the balance sheet; a cash wallet never has one', () => {
  const balances = computeBalances(ledger({}))
  assert.deepEqual(
    balances.accounts.map((a) => [a.ref.id, a.annualRateBps]),
    [
      ['savings', 900],
      ['other', null],
      ['wallet', null],
    ],
  )
})

test('month ends step back from the current month, which is "now"', () => {
  const now = at('2026-03-15T10:00:00Z')
  assert.deepEqual(
    monthEnds(3, now).map((d) => d.toISOString()),
    ['2026-01-31T23:59:59.999Z', '2026-02-28T23:59:59.999Z', '2026-03-15T10:00:00.000Z'],
  )
  // Across a year boundary, and a single point is just now.
  assert.deepEqual(monthEnds(2, at('2026-01-10T00:00:00Z')).map((d) => d.toISOString()), [
    '2025-12-31T23:59:59.999Z',
    '2026-01-10T00:00:00.000Z',
  ])
  assert.deepEqual(monthEnds(1, now), [now])
})
