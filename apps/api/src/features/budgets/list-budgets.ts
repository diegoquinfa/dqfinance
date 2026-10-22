import { and, eq, gte, isNotNull, or } from 'drizzle-orm'
import type { Db } from '../../db'
import { todayIn } from '../../shared/dates'
import { startOfDayIn } from '../../shared/day-range.ts'
import { fromCents } from '../../shared/money'
import { requireSettings } from '../settings/get-settings'
import { monthOf, monthsBetween, shareInMonth } from '../transactions/installments'
import { transaction } from '../transactions/transaction.schema'
import { budget } from './budget.schema'
import { budgetProgress } from './budget-progress'

export type BudgetView = {
  id: string
  categoryId: string
  currency: string
  /** What the category may spend in a month. */
  limit: number
  /** What was already spent in it this month. */
  spent: number
  /** What is left of the limit; negative when the limit is gone. */
  left: number
  /** How much of the limit is used. It can go past one. */
  ratio: number
  /** True when the limit is close. */
  close: boolean
}

/** The budgets of the user, with what each category has spent this month. */
export async function listBudgets(db: Db, userId: string): Promise<BudgetView[]> {
  const settings = await requireSettings(db, userId)
  const today = todayIn(settings.timezone)
  const currentMonth = today.slice(0, 7)
  const monthStart = `${today.slice(0, 8)}01`
  const budgets = await db.select().from(budget).where(eq(budget.userId, userId))
  // The expenses of the month itself, plus every spread expense that still owes this month a share:
  // a purchase of 600,000 over six months weighs 100,000 on each of those months.
  const expenses = await db
    .select({
      categoryId: transaction.categoryId,
      currency: transaction.currency,
      amountCents: transaction.amountCents,
      months: transaction.installmentMonths,
      occurredAt: transaction.occurredAt,
    })
    .from(transaction)
    .where(
      and(
        eq(transaction.userId, userId),
        eq(transaction.type, 'expense'),
        or(
          gte(transaction.occurredAt, startOfDayIn(settings.timezone, monthStart)),
          isNotNull(transaction.installmentMonths),
        ),
      ),
    )
  const totals = new Map<string, number>()
  for (const item of expenses) {
    const key = `${item.categoryId}|${item.currency}`
    const elapsed = monthsBetween(monthOf(item.occurredAt, settings.timezone), currentMonth)
    totals.set(key, (totals.get(key) ?? 0) + shareInMonth(item.amountCents, item.months, elapsed))
  }
  return budgets.map((row) => {
    const progress = budgetProgress(row.amountCents, totals.get(`${row.categoryId}|${row.currency}`) ?? 0)
    return {
      id: row.id,
      categoryId: row.categoryId,
      currency: row.currency,
      limit: fromCents(row.amountCents),
      spent: fromCents(progress.spentCents),
      left: fromCents(progress.leftCents),
      ratio: progress.ratio,
      close: progress.close,
    }
  })
}
