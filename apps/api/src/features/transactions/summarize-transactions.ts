import { eq, sql } from 'drizzle-orm'
import type { Db } from '../../db'
import { fromCents } from '../../shared/money'
import { card } from '../accounts/account.schema'
import { cardProduct, movementAmount, movementCurrency } from '../accounts/card-currency'
import { listTransactionsInput, transactionFilters } from './list-transactions'
import { transaction } from './transaction.schema'

export const summarizeTransactionsInput = listTransactionsInput.omit({ limit: true })

/**
 * Income and expense totals per currency for the same filters as the list, summed in SQL so no
 * page limit cuts them short. A foreign card charge counts in the card's currency, like its debt.
 */
export async function summarizeTransactions(db: Db, userId: string, input: typeof summarizeTransactionsInput._output) {
  const currency = movementCurrency
  const rows = await db
    .select({
      type: transaction.type,
      currency,
      cents: sql<number>`sum(${movementAmount})`,
    })
    .from(transaction)
    .leftJoin(card, eq(card.id, transaction.cardId))
    .leftJoin(cardProduct, eq(cardProduct.id, card.productId))
    .where(transactionFilters(userId, input))
    .groupBy(transaction.type, currency)

  return rows.map((row) => ({ type: row.type, currency: row.currency, amount: fromCents(Number(row.cents)) }))
}
