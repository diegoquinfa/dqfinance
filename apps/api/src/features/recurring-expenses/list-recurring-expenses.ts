import { and, asc, eq, lte } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { todayIn } from '../../shared/dates'
import type { Locale } from '../../shared/locale'
import { fromCents } from '../../shared/money'
import { card, cashWallet, product } from '../accounts/account.schema'
import { sourceRefOf } from '../accounts/source'
import { category } from '../categories/category.schema'
import { categoryName } from '../categories/system-categories'
import { counterparty } from '../counterparties/counterparty.schema'
import { requireSettings } from '../settings/get-settings'
import { recurringExpense } from './recurring-expense.schema'

export const listRecurringExpensesInput = z.object({
  pending: z.boolean().optional().describe("Only active items due today or earlier (the 'to confirm' inbox)"),
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
    })
    .from(recurringExpense)
    .leftJoin(product, eq(product.id, recurringExpense.productId))
    .leftJoin(cashWallet, eq(cashWallet.id, recurringExpense.cashWalletId))
    .leftJoin(card, eq(card.id, recurringExpense.cardId))
    .innerJoin(category, eq(category.id, recurringExpense.categoryId))
    .leftJoin(counterparty, eq(counterparty.id, recurringExpense.counterpartyId))
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
    source: { ...sourceRefOf(item), name: j.productName ?? j.walletName ?? j.cardName ?? '' },
    category: { id: item.categoryId, name: categoryName({ name: j.categoryName, systemKey: j.categorySystemKey }, locale) },
    counterparty: item.counterpartyId ? { id: item.counterpartyId, name: j.counterpartyName! } : null,
    frequency: item.frequency,
    startsOn: item.startsOn,
    nextDueOn: item.nextDueOn,
    active: item.active,
  }))
}
