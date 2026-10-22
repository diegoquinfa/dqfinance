import { and, eq, gte, isNull, lt, lte, or } from 'drizzle-orm'
import type { Db } from '../../db'
import { todayIn } from '../../shared/dates'
import { fromCents } from '../../shared/money'
import { shiftDay } from '../calendar/calendar-days'
import { recurringExpense } from '../recurring-expenses/recurring-expense.schema'
import { requireSettings } from '../settings/get-settings'
import { deliverWebhook } from './deliver-webhook'
import { webhook } from './webhook.schema'

export type DueCheck = {
  /** The bills that fell inside the lead time and had not been announced. */
  bills: number
  /** The calls that reached their endpoint. */
  delivered: number
  /** The calls that did not, and why. */
  failures: string[]
}

/**
 * Announces the bills that fall due inside the lead time the user set. A bill is announced once:
 * the due date it was announced for is kept, so the check does not call the hooks again.
 */
export async function checkDueBills(db: Db, userId: string): Promise<DueCheck> {
  const settings = await requireSettings(db, userId)
  const leadDays = settings.reminderLeadDays
  if (leadDays === null || leadDays <= 0) return { bills: 0, delivered: 0, failures: [] }

  const today = todayIn(settings.timezone)
  const until = shiftDay(today, leadDays)
  const bills = await db
    .select()
    .from(recurringExpense)
    .where(
      and(
        eq(recurringExpense.userId, userId),
        eq(recurringExpense.active, true),
        gte(recurringExpense.nextDueOn, today),
        lte(recurringExpense.nextDueOn, until),
        or(
          isNull(recurringExpense.notifiedOn),
          lt(recurringExpense.notifiedOn, recurringExpense.nextDueOn),
        ),
      ),
    )
  if (bills.length === 0) return { bills: 0, delivered: 0, failures: [] }

  const hooks = await db.select().from(webhook).where(and(eq(webhook.userId, userId), eq(webhook.active, true)))
  let delivered = 0
  const failures: string[] = []
  for (const bill of bills) {
    const payload = {
      event: 'bill.due',
      occurredAt: new Date().toISOString(),
      bill: {
        id: bill.id,
        name: bill.name,
        amount: fromCents(bill.amountCents),
        currency: bill.currency,
        dueOn: bill.nextDueOn,
      },
    }
    for (const hook of hooks) {
      const result = await deliverWebhook(hook, 'bill.due', payload)
      if (result.delivered) delivered++
      else failures.push(`${hook.url}: ${result.error ?? 'the call failed'}`)
    }
    // The bill was announced, whether the calls reached their endpoints or not: the app does not
    // call the hooks again for the same due date.
    await db
      .update(recurringExpense)
      .set({ notifiedOn: bill.nextDueOn })
      .where(eq(recurringExpense.id, bill.id))
  }
  return { bills: bills.length, delivered, failures }
}
