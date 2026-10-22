import { and, eq, gte, lte, sql } from 'drizzle-orm'
import type { Db } from '../../db'
import { todayIn } from '../../shared/dates'
import { fromCents, toCents } from '../../shared/money'
import { assetsAndLiabilities } from '../balances/compute-balances'
import { getBalances } from '../balances/get-balances'
import { recurringExpense } from '../recurring-expenses/recurring-expense.schema'
import { monthlySetAside } from '../recurring-expenses/monthly-set-aside'
import { listGoals } from '../savings-goals/list-goals'
import { requireSettings } from '../settings/get-settings'
import { transaction } from '../transactions/transaction.schema'
import { safeToSpend } from './safe-to-spend'
import { monthPeriod } from './spending-period'

/**
 * What the user may spend today, in their primary currency. The money in hand is what the balances
 * hold (a card's debt counts against it), the bills are the recurring expenses still due before the
 * period ends, and the cap is the one the user set for the month.
 */
export async function getSafeToSpend(db: Db, userId: string) {
  const settings = await requireSettings(db, userId)
  const currency = settings.primaryCurrency
  const today = todayIn(settings.timezone)
  const month = monthPeriod(today)
  const period = month

  const balances = await getBalances(db, userId)
  const totals = assetsAndLiabilities(balances).find((total) => total.currency === currency)
  const inHandCents = (totals?.assetsCents ?? 0) - (totals?.liabilitiesCents ?? 0)

  const bills = await db
    .select({ amountCents: recurringExpense.amountCents })
    .from(recurringExpense)
    .where(
      and(
        eq(recurringExpense.userId, userId),
        eq(recurringExpense.active, true),
        eq(recurringExpense.currency, currency),
        gte(recurringExpense.nextDueOn, today),
        lte(recurringExpense.nextDueOn, period.end),
      ),
    )
  const pendingBillsCents = bills.reduce((sum, bill) => sum + bill.amountCents, 0)

  // What the user already spent this month. Transfers and adjustments are not expenses (design D3).
  const monthStart = `${period.end.slice(0, 8)}01`
  const spent = await db
    .select({ cents: sql<number>`sum(${transaction.amountCents})` })
    .from(transaction)
    .where(
      and(
        eq(transaction.userId, userId),
        eq(transaction.type, 'expense'),
        eq(transaction.currency, currency),
        gte(transaction.occurredAt, new Date(`${monthStart}T00:00:00Z`)),
      ),
    )
  const spentCents = Number(spent[0]?.cents ?? 0)

  // A yearly bill sets aside a twelfth of its amount every month, so the money is there when it
  // comes. The savings goals (proposal 6) add to this.
  const yearly = await db
    .select({ amountCents: recurringExpense.amountCents })
    .from(recurringExpense)
    .where(
      and(
        eq(recurringExpense.userId, userId),
        eq(recurringExpense.active, true),
        eq(recurringExpense.currency, currency),
        eq(recurringExpense.frequency, 'yearly'),
      ),
    )
  const setAsidesCents =
    yearly.reduce((sum, item) => sum + monthlySetAside(item.amountCents), 0) +
    // The goals ask for their own share every month, on top of the yearly bills.
    (await listGoals(db, userId))
      .filter((goal) => goal.currency === currency)
      .reduce((sum, goal) => sum + toCents(goal.monthly), 0)

  const result = safeToSpend({
    availableCents: inHandCents,
    pendingBillsCents,
    setAsidesCents,
    spentCents,
    targetCents: settings.spendingTargetCents,
    daysLeft: period.daysLeft,
  })

  return {
    currency,
    day: today,
    periodEnd: period.end,
    daysLeft: result.daysLeft,
    available: fromCents(inHandCents),
    pendingBills: fromCents(pendingBillsCents),
    setAsides: fromCents(setAsidesCents),
    free: fromCents(result.freeCents),
    daily: fromCents(result.dailyCents),
    target: settings.spendingTargetCents === null ? null : fromCents(settings.spendingTargetCents),
    targetDaily: result.targetDailyCents === null ? null : fromCents(result.targetDailyCents),
    allowed: fromCents(result.allowedCents),
    cappedByTarget: result.cappedByTarget,
  }
}
