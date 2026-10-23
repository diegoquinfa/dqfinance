import { eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { isoDate, todayIn } from '../../shared/dates'
import type { Locale } from '../../shared/locale'
import { card } from '../accounts/account.schema'
import { cardProduct, movementAmount, movementCurrency } from '../accounts/card-currency'
import { listRecurringExpenses } from '../recurring-expenses/list-recurring-expenses'
import { requireSettings } from '../settings/get-settings'
import { transactionFilters } from '../transactions/list-transactions'
import { transaction } from '../transactions/transaction.schema'
import { groupByDay, projectDueDates, shiftDay } from './calendar-days'

const MAX_DAYS = 62

export const getCalendarInput = z
  .object({
    from: isoDate.describe('Inclusive start date, YYYY-MM-DD, user timezone'),
    to: isoDate.describe('Exclusive end date, YYYY-MM-DD, user timezone'),
  })
  .refine(({ from, to }) => from < to && to <= shiftDay(from, MAX_DAYS), {
    message: `from must be before to, at most ${MAX_DAYS} days apart`,
  })

/**
 * Per day of the user's calendar: what was spent and received (per currency), and the recurring
 * expenses due. Transfers and adjustments are not movements, so they never count (D3).
 */
export async function getCalendar(db: Db, userId: string, locale: Locale, input: z.infer<typeof getCalendarInput>) {
  const [{ timezone }, rows, recurring] = await Promise.all([
    requireSettings(db, userId),
    // The movement filter takes UTC days; one day of margin each side covers any timezone offset.
    db
      .select({
        type: transaction.type,
        currency: movementCurrency,
        cents: movementAmount,
        occurredAt: transaction.occurredAt,
      })
      .from(transaction)
      .leftJoin(card, eq(card.id, transaction.cardId))
      .leftJoin(cardProduct, eq(cardProduct.id, card.productId))
      .where(transactionFilters(userId, { from: shiftDay(input.from, -1), to: shiftDay(input.to, 1) })),
    listRecurringExpenses(db, userId, locale),
  ])

  const today = todayIn(timezone)
  const due = recurring
    .filter((item) => item.active)
    .flatMap((item) => projectDueDates(item, input.from, input.to, today).map((day) => ({ day, ...item })))
    .sort((a, b) => a.day.localeCompare(b.day))

  return {
    days: groupByDay(
      rows.map((row) => ({ ...row, cents: Number(row.cents) })),
      timezone,
      input.from,
      input.to,
    ),
    due,
  }
}
