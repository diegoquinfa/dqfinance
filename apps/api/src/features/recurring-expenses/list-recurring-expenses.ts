import { and, asc, eq, lte } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { z } from 'zod'
import type { Db } from '../../db'
import { todayIn } from '../../shared/dates'
import type { Locale } from '../../shared/locale'
import { fromCents } from '../../shared/money'
import { bank, bankAccount, card, cashWallet, product } from '../accounts/account.schema'
import { cardProduct } from '../accounts/card-currency'
import { sourceRefOf } from '../accounts/source'
import { category } from '../categories/category.schema'
import { categoryName } from '../categories/system-categories'
import { counterparty } from '../counterparties/counterparty.schema'
import { requireSettings } from '../settings/get-settings'
import { recurringExpense } from './recurring-expense.schema'

// The bank behind a source: the product's own bank account, and the one of a card's product.
const sourceAccount = alias(bankAccount, 'source_account')
const sourceBank = alias(bank, 'source_bank')
const cardAccount = alias(bankAccount, 'card_account')
const cardBank = alias(bank, 'card_bank')

export const listRecurringExpensesInput = z.object({
  pending: z.boolean().optional().describe("Only items due today or earlier (the 'to confirm' inbox)"),
})

export async function listRecurringExpenses(
  db: Db,
  userId: string,
  locale: Locale,
  input: z.infer<typeof listRecurringExpensesInput> = {},
) {
  const today = input.pending ? todayIn((await requireSettings(db, userId)).timezone) : null
  const rows = await db
    .select({
      item: recurringExpense,
      productName: product.name,
      walletName: cashWallet.name,
      cardName: card.name,
      categoryName: category.name,
      categorySystemKey: category.systemKey,
      counterpartyName: counterparty.name,
      sourceBankName: sourceBank.name,
      sourceLast4: sourceAccount.last4,
      cardBankName: cardBank.name,
      cardLast4: card.last4,
    })
    .from(recurringExpense)
    .leftJoin(product, eq(product.id, recurringExpense.productId))
    .leftJoin(cashWallet, eq(cashWallet.id, recurringExpense.cashWalletId))
    .leftJoin(card, eq(card.id, recurringExpense.cardId))
    // The product behind a card, to read the bank account it belongs to.
    .leftJoin(cardProduct, eq(cardProduct.id, card.productId))
    .innerJoin(category, eq(category.id, recurringExpense.categoryId))
    .leftJoin(counterparty, eq(counterparty.id, recurringExpense.counterpartyId))
    .leftJoin(sourceAccount, eq(sourceAccount.id, product.bankAccountId))
    .leftJoin(sourceBank, eq(sourceBank.id, sourceAccount.bankId))
    .leftJoin(cardAccount, eq(cardAccount.id, cardProduct.bankAccountId))
    .leftJoin(cardBank, eq(cardBank.id, cardAccount.bankId))
    .where(
      and(
        eq(recurringExpense.userId, userId),
        today ? eq(recurringExpense.active, true) : undefined,
        today ? lte(recurringExpense.nextDueOn, today) : undefined,
      ),
    )
    .orderBy(asc(recurringExpense.nextDueOn))

  return rows.map(({ item, ...j }) => ({
    id: item.id,
    name: item.name,
    amount: fromCents(item.amountCents),
    currency: item.currency,
    source: {
      ...sourceRefOf(item),
      name: j.productName ?? j.walletName ?? j.cardName ?? '',
      // The bank the money moves in: null for a cash wallet, which has none.
      bankName: item.productId ? j.sourceBankName : item.cardId ? j.cardBankName : null,
      last4: item.productId ? j.sourceLast4 : item.cardId ? j.cardLast4 : null,
    },
    category: { id: item.categoryId, name: categoryName({ name: j.categoryName, systemKey: j.categorySystemKey }, locale) },
    counterparty: item.counterpartyId ? { id: item.counterpartyId, name: j.counterpartyName! } : null,
    frequency: item.frequency,
    startsOn: item.startsOn,
    nextDueOn: item.nextDueOn,
    active: item.active,
  }))
}
