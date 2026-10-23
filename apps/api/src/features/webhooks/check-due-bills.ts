import { and, eq, gte, isNull, lt, lte, or } from 'drizzle-orm'
import type { Db } from '../../db'
import { todayIn } from '../../shared/dates'
import { fromCents } from '../../shared/money'
import { shiftDay } from '../calendar/calendar-days'
import { recurringExpense } from '../recurring-expenses/recurring-expense.schema'
import { requireSettings } from '../settings/get-settings'
import { isAnnounced } from './announcement-rule'
import { billDeliveryId, deliverWebhook } from './deliver-webhook'
import { refuseGuest } from './webhooks'
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
 * Announces the bills that fall due inside the lead time the user set. A bill is announced only once
 * every active hook received it: then the due date it was announced for is kept, so the check does
 * not call the hooks again. With no active hook, or with any call failed, nothing is kept and the
 * next check calls every hook again, so a lost call does not lose the reminder. Retrying repeats
 * the delivery of the hooks that did succeed; the delivery id is the same, so a receiver that dedups
 * drops the repeat.
 */
export async function checkDueBills(db: Db, userId: string): Promise<DueCheck> {
  await refuseGuest(db, userId)
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
    let received = 0
    for (const hook of hooks) {
      const result = await deliverWebhook(hook, 'bill.due', payload, billDeliveryId(bill.id, bill.nextDueOn))
      if (result.delivered) {
        delivered++
        received++
      } else failures.push(`${hook.url}: ${result.error ?? 'the call failed'}`)
    }
    // Only a bill every active hook received is announced: with no hook, or with any call failed,
    // the due date stays open and the next check calls every hook again.
    if (!isAnnounced(received, hooks.length)) continue
    await db
      .update(recurringExpense)
      .set({ notifiedOn: bill.nextDueOn })
      .where(and(eq(recurringExpense.id, bill.id), eq(recurringExpense.userId, userId)))
  }
  return { bills: bills.length, delivered, failures }
}
