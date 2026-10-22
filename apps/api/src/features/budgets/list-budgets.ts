import { and, eq, gte, sql } from 'drizzle-orm'
import type { Db } from '../../db'
import { todayIn } from '../../shared/dates'
import { fromCents } from '../../shared/money'
import { requireSettings } from '../settings/get-settings'
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
  const monthStart = `${today.slice(0, 8)}01`
  const budgets = await db.select().from(budget).where(eq(budget.userId, userId))
  const spent = await db
    .select({
      categoryId: transaction.categoryId,
      currency: transaction.currency,
      cents: sql<number>`sum(${transaction.amountCents})`,
    })
    .from(transaction)
    .where(
      and(
        eq(transaction.userId, userId),
        eq(transaction.type, 'expense'),
        gte(transaction.occurredAt, new Date(`${monthStart}T00:00:00Z`)),
      ),
    )
    .groupBy(transaction.categoryId, transaction.currency)
  const totals = new Map(spent.map((row) => [`${row.categoryId}|${row.currency}`, Number(row.cents ?? 0)]))
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
