import { and, eq, gte, lt, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { isoDate, todayIn } from '../../shared/dates'
import { startOfDayIn } from '../../shared/day-range.ts'
import { AppError } from '../../shared/http'
import type { Locale } from '../../shared/locale'
import { fromCents } from '../../shared/money'
import { card } from '../accounts/account.schema'
import { cardProduct, movementAmount, movementCurrency } from '../accounts/card-currency'
import { category } from '../categories/category.schema'
import { requireSettings } from '../settings/get-settings'
import { transaction } from '../transactions/transaction.schema'
import { contactCategories, contactTotals, offsetSecondsAt } from './contact-breakdown'
import { counterparty } from './counterparty.schema'

export const getCounterpartyInput = z.object({
  from: isoDate.optional().describe("Inclusive start day, YYYY-MM-DD, on the user's calendar"),
  to: isoDate.optional().describe("Exclusive end day, YYYY-MM-DD, on the user's calendar"),
})

/**
 * One contact in full: the money it moved, what it moved it for, and how it moved month by
 * month. Everything is inside the period and per currency: money never mixes currencies.
 */
export async function getCounterparty(
  db: Db,
  userId: string,
  locale: Locale,
  id: string,
  input: z.infer<typeof getCounterpartyInput>,
) {
  const contact = await db
    .select({ id: counterparty.id, name: counterparty.name, kind: counterparty.kind })
    .from(counterparty)
    .where(and(eq(counterparty.id, id), eq(counterparty.userId, userId)))
    .get()
  // A contact of another user is not found.
  if (!contact) throw new AppError('counterparty_not_found', 404)

  // The movements of this contact. The period compares the same way the transaction list does:
  // an inclusive start day and an exclusive end day, both on the user's clock. The totals are the
  // whole history, the way the list shows them; the period only shapes the breakdown and the
  // monthly series.
  const settings = await requireSettings(db, userId)
  const history = and(eq(transaction.userId, userId), eq(transaction.counterpartyId, contact.id))
  const scope = and(
    history,
    input.from ? gte(transaction.occurredAt, startOfDayIn(settings.timezone, input.from)) : undefined,
    input.to ? lt(transaction.occurredAt, startOfDayIn(settings.timezone, input.to)) : undefined,
  )
  const amount = movementAmount
  const currency = movementCurrency
  const spent = sql<number>`sum(case when ${transaction.type} = 'expense' then ${amount} else 0 end)`
  const received = sql<number>`sum(case when ${transaction.type} = 'income' then ${amount} else 0 end)`

  const totals = await db
    .select({
      currency,
      spentCents: spent,
      receivedCents: received,
      movements: sql<number>`count(${transaction.id})`,
      expenses: sql<number>`count(case when ${transaction.type} = 'expense' then 1 end)`,
      firstAt: sql<number | null>`min(${transaction.occurredAt})`,
      lastAt: sql<number | null>`max(${transaction.occurredAt})`,
    })
    .from(transaction)
    .leftJoin(card, eq(card.id, transaction.cardId))
    .leftJoin(cardProduct, eq(cardProduct.id, card.productId))
    .where(history)
    .groupBy(currency)

  const byCategory = await db
    .select({
      categoryId: transaction.categoryId,
      categoryName: category.name,
      categorySystemKey: category.systemKey,
      categoryKind: category.kind,
      currency,
      amountCents: sql<number>`sum(${amount})`,
      movements: sql<number>`count(${transaction.id})`,
    })
    .from(transaction)
    .leftJoin(card, eq(card.id, transaction.cardId))
    .leftJoin(cardProduct, eq(cardProduct.id, card.productId))
    .leftJoin(category, eq(category.id, transaction.categoryId))
    .where(scope)
    .groupBy(transaction.categoryId, category.name, category.systemKey, category.kind, currency)

  // The monthly series buckets by the user's month, not the UTC one: SQLite reads the stored
  // instant after shifting it by the offset in effect at the period's start (today, when the period
  // is open). shortcut: a movement within an hour of a daylight-saving change can land in the
  // previous month; upgrade to a per-row offset when that matters.
  const periodStart = startOfDayIn(settings.timezone, input.from ?? todayIn(settings.timezone))
  const offsetSeconds = offsetSecondsAt(settings.timezone, periodStart)
  const month = sql<string>`strftime('%Y-%m', ${transaction.occurredAt} / 1000 + ${offsetSeconds}, 'unixepoch')`
  const monthly = await db
    .select({
      month,
      currency,
      spentCents: spent,
      receivedCents: received,
    })
    .from(transaction)
    .leftJoin(card, eq(card.id, transaction.cardId))
    .leftJoin(cardProduct, eq(cardProduct.id, card.productId))
    .where(scope)
    .groupBy(month, currency)

  const summary = contactTotals(totals)

  return {
    ...contact,
    totals: summary.totals,
    movements: summary.movements,
    firstMovementAt: summary.firstMovementAt,
    lastMovementAt: summary.lastMovementAt,
    byCategory: contactCategories(byCategory, locale),
    monthly: monthly.map((row) => ({
      month: row.month,
      currency: row.currency,
      spent: fromCents(Number(row.spentCents ?? 0)),
      received: fromCents(Number(row.receivedCents ?? 0)),
    })),
  }
}
