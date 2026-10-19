import { and, asc, eq, like, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { z } from 'zod'
import type { Db } from '../../db'
import { card, product } from '../accounts/account.schema'
import { transaction } from '../transactions/transaction.schema'
import { counterpartyAggregates } from './counterparty-aggregates'
import { COUNTERPARTY_KINDS, counterparty } from './counterparty.schema'

export const listCounterpartiesInput = z.object({
  kind: z.enum(COUNTERPARTY_KINDS).optional(),
  search: z.string().trim().max(80).optional().describe('Case-insensitive name fragment'),
})

// The product behind a card: a foreign card charge counts in the card's currency (like summarize-transactions.ts).
const cardProduct = alias(product, 'card_product')

/**
 * Every counterparty of the user with the totals of its movements, one line per currency.
 * Only the user's own rows: the counterparty and the movements behind it.
 */
export async function listCounterparties(db: Db, userId: string, input: z.infer<typeof listCounterpartiesInput> = {}) {
  const currency = sql<string | null>`case when ${transaction.primaryAmountCents} is null then ${transaction.currency} else coalesce(${cardProduct.currency}, ${transaction.currency}) end`
  const amount = sql<number>`coalesce(${transaction.primaryAmountCents}, ${transaction.amountCents})`
  const rows = await db
    .select({
      id: counterparty.id,
      name: counterparty.name,
      kind: counterparty.kind,
      currency,
      spentCents: sql<number | null>`sum(case when ${transaction.type} = 'expense' then ${amount} else 0 end)`,
      receivedCents: sql<number | null>`sum(case when ${transaction.type} = 'income' then ${amount} else 0 end)`,
      movements: sql<number>`count(${transaction.id})`,
      lastMovementAt: sql<number | null>`max(${transaction.occurredAt})`,
    })
    .from(counterparty)
    .leftJoin(transaction, and(eq(transaction.counterpartyId, counterparty.id), eq(transaction.userId, userId)))
    .leftJoin(card, eq(card.id, transaction.cardId))
    .leftJoin(cardProduct, eq(cardProduct.id, card.productId))
    .where(
      and(
        eq(counterparty.userId, userId),
        input.kind ? eq(counterparty.kind, input.kind) : undefined,
        input.search ? like(counterparty.name, `%${input.search}%`) : undefined,
      ),
    )
    .groupBy(counterparty.id, counterparty.name, counterparty.kind, currency)
    .orderBy(asc(counterparty.name))

  return counterpartyAggregates(rows)
}
