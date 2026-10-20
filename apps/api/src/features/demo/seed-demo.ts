import * as m from '@dqfinance/i18n/messages'
import { eq } from 'drizzle-orm'
import type { Db } from '../../db'
import { todayIn } from '../../shared/dates'
import type { Locale } from '../../shared/locale'
import { toCents } from '../../shared/money'
import { bank, bankAccount, card, cashWallet, product } from '../accounts/account.schema'
import { balanceAdjustment } from '../balance-adjustments/balance-adjustment.schema'
import { category, SYSTEM_CATEGORY_KEYS } from '../categories/category.schema'
import { defaultCategoryRows } from '../categories/default-categories'
import { SYSTEM_KINDS } from '../categories/system-categories'
import { counterparty } from '../counterparties/counterparty.schema'
import { recurringExpense } from '../recurring-expenses/recurring-expense.schema'
import { userCurrency, userSettings } from '../settings/settings.schema'
import { transaction } from '../transactions/transaction.schema'
import { transfer } from '../transfers/transfer.schema'
import {
  contactName,
  CONTACTS,
  dayFrom,
  dayIn,
  DEMO_COUNTRY,
  DEMO_CURRENCY,
  DEMO_MONTHS,
  DEMO_TIMEZONE,
  demoMovements,
  demoTransfers,
  movementDescription,
  RECURRING,
  type CategoryKey,
  type ContactKey,
  type DemoSource,
} from './demo-ledger'

/**
 * Writes the demo ledger a guest finds when it signs in.
 *
 * It obeys the domain rules: money is integer cents and always positive (the type carries
 * the sign), the opening balance is a `balance_adjustment` and not a fake movement (D2), and
 * the transfers are transfers, never income or expense (D3).
 */

/** A day in the demo's timezone, as a datetime. Noon keeps the date stable everywhere. */
const at = (date: string) => new Date(`${date}T12:00:00.000Z`)

/**
 * Writes the demo ledger. It does nothing when the user already has settings, so the web
 * can call it on every load. Everything goes in one batch: a half-seeded ledger is worse
 * than none.
 */
export async function seedDemo(db: Db, userId: string, locale: Locale): Promise<{ seeded: boolean }> {
  const already = await db.select({ userId: userSettings.userId }).from(userSettings).where(eq(userSettings.userId, userId)).get()
  if (already) return { seeded: false }

  const today = todayIn(DEMO_TIMEZONE)

  // The ids are ours, so every row can be written in one batch.
  const bankId = crypto.randomUUID()
  const bankAccountId = crypto.randomUUID()
  const checkingId = crypto.randomUUID()
  const savingsId = crypto.randomUUID()
  const walletId = crypto.randomUUID()
  const cardId = crypto.randomUUID()
  const contactIds = new Map<ContactKey, string>(CONTACTS.map((c) => [c.key, crypto.randomUUID()]))
  const categoryIds = new Map<string, string>()

  const categoryRows = defaultCategoryRows(userId, locale).map((row) => {
    const id = crypto.randomUUID()
    categoryIds.set(row.name!, id)
    return { ...row, id }
  })
  const systemRows = SYSTEM_CATEGORY_KEYS.map((systemKey) => ({
    id: crypto.randomUUID(),
    userId,
    systemKey,
    kind: SYSTEM_KINDS[systemKey],
  }))
  const allCategoryRows = [...categoryRows, ...systemRows]
  const categoryId = (key: CategoryKey) => {
    const name = m[`category_default_${key}`]({}, { locale })
    const id = categoryIds.get(name)
    if (!id) throw new Error(`demo category missing: ${key}`)
    return id
  }

  // The movements of every month of the ledger.
  const movements: (typeof transaction.$inferInsert)[] = []
  const transfers: (typeof transfer.$inferInsert)[] = []
  /** The demo's four sources, as the three nullable foreign keys a movement carries. */
  const sourceColumns = (source: DemoSource) => {
    if (source === 'checking') return { productId: checkingId, cashWalletId: null, cardId: null }
    if (source === 'savings') return { productId: savingsId, cashWalletId: null, cardId: null }
    if (source === 'card') return { productId: null, cashWalletId: null, cardId: cardId }
    return { productId: null, cashWalletId: walletId, cardId: null }
  }
  for (let monthsBack = DEMO_MONTHS - 1; monthsBack >= 0; monthsBack--) {
    for (const movement of demoMovements(today, monthsBack)) {
      movements.push({
        id: crypto.randomUUID(),
        userId,
        type: movement.type,
        amountCents: toCents(movement.amount),
        currency: DEMO_CURRENCY,
        ...sourceColumns(movement.source),
        categoryId: categoryId(movement.category),
        counterpartyId: contactIds.get(movement.contact) ?? null,
        description: movementDescription(movement.description, locale),
        occurredAt: at(movement.date),
      })
    }
    for (const movement of demoTransfers(today, monthsBack)) {
      transfers.push({
        id: crypto.randomUUID(),
        userId,
        fromProductId: checkingId,
        toProductId: movement.to === 'savings' ? savingsId : null,
        toCardId: movement.to === 'card' ? cardId : null,
        sentAmountCents: toCents(movement.amount),
        sentCurrency: DEMO_CURRENCY,
        receivedAmountCents: toCents(movement.amount),
        receivedCurrency: DEMO_CURRENCY,
        feeCents: null,
        costBasisCents: null,
        note: null,
        sentAt: at(movement.date),
        receivedAt: at(movement.date),
      })
    }
  }

  // The opening balances: an adjustment, never a fake movement (D2).
  const opening = (productId: string | null, cashWalletId: string | null, amount: number) => ({
    id: crypto.randomUUID(),
    userId,
    productId,
    cashWalletId,
    currency: DEMO_CURRENCY,
    observedBalanceCents: toCents(amount),
    deltaCents: toCents(amount),
    note: m.demo_opening_balance({}, { locale }),
    adjustedAt: at(dayIn(today, DEMO_MONTHS - 1, 1)),
  })
  const adjustments: (typeof balanceAdjustment.$inferInsert)[] = [
    opening(checkingId, null, 1850),
    opening(savingsId, null, 9000),
    opening(null, walletId, 400),
  ]

  const recurring: (typeof recurringExpense.$inferInsert)[] = RECURRING.map((item) => ({
    id: crypto.randomUUID(),
    userId,
    name: contactName(item.name, locale),
    amountCents: toCents(item.amount),
    currency: DEMO_CURRENCY,
    productId: checkingId,
    categoryId: categoryId(item.category),
    counterpartyId: contactIds.get(item.name) ?? null,
    frequency: 'monthly',
    startsOn: dayIn(today, DEMO_MONTHS - 1, 1),
    nextDueOn: dayFrom(today, item.inDays),
    active: true,
  }))

  // D1 allows 100 bound parameters per statement, so the rows go in chunks; one batch keeps them atomic.
  await db.batch([
    db.insert(userSettings).values({
      userId,
      country: DEMO_COUNTRY,
      locale,
      timezone: DEMO_TIMEZONE,
      primaryCurrency: DEMO_CURRENCY,
      onboardedAt: new Date(),
    }),
    db.insert(userCurrency).values([{ userId, code: DEMO_CURRENCY }]),
    ...chunked(allCategoryRows, 10, (rows) => db.insert(category).values(rows)),
    db.insert(bank).values({ id: bankId, userId, name: m.demo_bank_name({}, { locale }) }),
    db.insert(bankAccount).values({
      id: bankAccountId,
      userId,
      bankId,
      name: m.demo_bank_account_name({}, { locale }),
      last4: '4417',
    }),
    ...chunked(
      [
        {
          id: checkingId,
          userId,
          bankAccountId,
          type: 'checking' as const,
          name: m.product_checking({}, { locale }),
          currency: DEMO_CURRENCY,
          annualRateBps: null,
          parentProductId: null,
          yieldPayout: null,
        },
        {
          id: savingsId,
          userId,
          bankAccountId,
          type: 'savings' as const,
          name: m.product_savings({}, { locale }),
          currency: DEMO_CURRENCY,
          annualRateBps: 420,
          parentProductId: null,
          yieldPayout: 'monthly' as const,
        },
      ],
      8,
      (rows) => db.insert(product).values(rows),
    ),
    db.insert(cashWallet).values({
      id: walletId,
      userId,
      name: m.cash_wallet_default_name({}, { locale }),
      currency: DEMO_CURRENCY,
    }),
    db.insert(card).values({
      id: cardId,
      userId,
      productId: checkingId,
      kind: 'credit',
      name: m.demo_card_name({}, { locale }),
      last4: '8802',
      creditLimitCents: toCents(2500),
      statementDay: 15,
      dueDay: 5,
      brand: 'visa',
      interestRateBps: 2450,
      interestRatePeriod: 'annual',
      color: 'signal',
    }),
    ...chunked(
      CONTACTS.map((contact) => ({
        id: contactIds.get(contact.key)!,
        userId,
        name: contactName(contact.key, locale),
        kind: contact.kind,
      })),
      12,
      (rows) => db.insert(counterparty).values(rows),
    ),
    ...chunked(movements, 6, (rows) => db.insert(transaction).values(rows)),
    ...chunked(transfers, 4, (rows) => db.insert(transfer).values(rows)),
    ...chunked(adjustments, 8, (rows) => db.insert(balanceAdjustment).values(rows)),
    ...chunked(recurring, 6, (rows) => db.insert(recurringExpense).values(rows)),
  ])

  return { seeded: true }
}

/** Splits the rows into statements D1 accepts, and keeps one batch around them. */
const chunked = <T, S>(rows: T[], size: number, insert: (rows: T[]) => S): S[] =>
  chunks(rows, size).map((chunk) => insert(chunk))

const chunks = <T>(rows: T[], size: number) =>
  Array.from({ length: Math.ceil(rows.length / size) }, (_, index) => rows.slice(index * size, (index + 1) * size))
