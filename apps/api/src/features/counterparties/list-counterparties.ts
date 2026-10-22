import { and, asc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { cardProduct, movementAmount, movementCurrency } from '../accounts/card-currency'
import { card } from '../accounts/account.schema'
import { transaction } from '../transactions/transaction.schema'
import { counterpartyAggregates } from './counterparty-aggregates'
import { COUNTERPARTY_KINDS, counterparty } from './counterparty.schema'
import { escapeLike } from './escape-like.ts'

export const listCounterpartiesInput = z.object({
  kind: z.enum(COUNTERPARTY_KINDS).optional(),
  search: z.string().trim().max(80).optional().describe('Case-insensitive name fragment'),
})

/**
 * Every counterparty of the user with the totals of its movements, one line per currency.
 * Only the user's own rows: the counterparty and the movements behind it.
 */
export async function listCounterparties(db: Db, userId: string, input: z.infer<typeof listCounterpartiesInput> = {}) {
  const currency = movementCurrency
  const amount = movementAmount
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
        input.search
          ? sql`${counterparty.name} like ${`%${escapeLike(input.search)}%`} escape '\\'`
          : undefined,
      ),
    )
    .groupBy(counterparty.id, counterparty.name, counterparty.kind, currency)
    .orderBy(asc(counterparty.name))

  return counterpartyAggregates(rows)
}
