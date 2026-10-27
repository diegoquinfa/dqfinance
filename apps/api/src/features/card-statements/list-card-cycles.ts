import { and, desc, eq, gte, isNotNull, sql } from 'drizzle-orm'
import type { Db } from '../../db'
import { startOfDayIn } from '../../shared/day-range.ts'
import { card, product } from '../accounts/account.schema'
import { cardProduct, movementAmount, movementCurrency } from '../accounts/card-currency'
import { shiftDay } from '../calendar/calendar-days.ts'
import { transaction } from '../transactions/transaction.schema'
import { transfer } from '../transfers/transfer.schema'
import { cardStatement } from './card-statement.schema'
import { dueOnAfter, lastCutOn, remainingCents } from './statement-dates'

export type CardCycle = {
  id: string
  name: string
  currency: string
  statementDay: number | null
  dueDay: number | null
  /** The last cut; null when the card has no cut day. */
  lastCutOn: string | null
  /** The payment day of the last cut; null without a cut or payment day. */
  dueOn: string | null
  /** What the card was charged since the last cut: it goes on the next statement. */
  cycleChargesCents: number
  /** The latest statement the user recorded, and what it still asks for. */
  statement: {
    closedOn: string
    dueOn: string
    paymentCents: number
    paidCents: number
    remainingCents: number
  } | null
  /** True when the last cut has passed and its statement is not recorded yet. */
  statementMissing: boolean
}

/**
 * Where each credit card stands in its cycle (design D16): its last cut, what was charged since,
 * and the latest statement with what is left to pay. A payment is a transfer that reached the card
 * in its own currency after the statement's cut; one made before the cut is already in the
 * statement.
 */
export async function listCardCycles(db: Db, userId: string, today: string, timeZone: string): Promise<CardCycle[]> {
  const cards = await db
    .select({
      id: card.id,
      name: card.name,
      currency: product.currency,
      statementDay: card.statementDay,
      dueDay: card.dueDay,
    })
    .from(card)
    .innerJoin(product, eq(product.id, card.productId))
    .where(and(eq(card.userId, userId), eq(card.kind, 'credit')))
  if (cards.length === 0) return []

  const [statements, payments] = await Promise.all([
    db
      .select({
        cardId: cardStatement.cardId,
        closedOn: cardStatement.closedOn,
        dueOn: cardStatement.dueOn,
        paymentCents: cardStatement.paymentCents,
      })
      .from(cardStatement)
      .where(eq(cardStatement.userId, userId))
      .orderBy(desc(cardStatement.closedOn)),
    db
      .select({
        cardId: transfer.toCardId,
        cents: transfer.receivedAmountCents,
        currency: transfer.receivedCurrency,
        receivedAt: transfer.receivedAt,
      })
      .from(transfer)
      .where(and(eq(transfer.userId, userId), isNotNull(transfer.toCardId), isNotNull(transfer.receivedAt))),
  ])

  return Promise.all(
    cards.map(async (owned): Promise<CardCycle> => {
      const cut = owned.statementDay ? lastCutOn(today, owned.statementDay) : null
      const latest = statements.find((row) => row.cardId === owned.id) ?? null

      let statement: CardCycle['statement'] = null
      if (latest) {
        const after = startOfDayIn(timeZone, shiftDay(latest.closedOn, 1)).getTime()
        const paidCents = payments
          .filter((row) => row.cardId === owned.id && row.currency === owned.currency && row.receivedAt!.getTime() >= after)
          .reduce((sum, row) => sum + row.cents, 0)
        const { closedOn, dueOn, paymentCents } = latest
        statement = { closedOn, dueOn, paymentCents, paidCents, remainingCents: remainingCents(paymentCents, paidCents) }
      }

      // The charges of the open cycle, in the card's currency like its debt.
      const charges = cut
        ? await db
            .select({ cents: sql<number>`coalesce(sum(${movementAmount}), 0)` })
            .from(transaction)
            .leftJoin(card, eq(card.id, transaction.cardId))
            .leftJoin(cardProduct, eq(cardProduct.id, card.productId))
            .where(
              and(
                eq(transaction.userId, userId),
                eq(transaction.cardId, owned.id),
                eq(transaction.type, 'expense'),
                eq(movementCurrency, owned.currency),
                gte(transaction.occurredAt, startOfDayIn(timeZone, shiftDay(cut, 1))),
              ),
            )
        : [{ cents: 0 }]

      return {
        ...owned,
        lastCutOn: cut,
        dueOn: cut && owned.dueDay ? dueOnAfter(cut, owned.dueDay) : null,
        cycleChargesCents: Number(charges[0]?.cents ?? 0),
        statement,
        statementMissing: cut !== null && (latest === null || latest.closedOn < cut),
      }
    }),
  )
}
