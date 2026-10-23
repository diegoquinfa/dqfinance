import { and, eq, gte, isNotNull, lt, or, sum } from 'drizzle-orm'
import type { Db } from '../../db'
import { todayIn } from '../../shared/dates'
import { startOfDayIn } from '../../shared/day-range.ts'
import { fromCents, toCents } from '../../shared/money'
import { card } from '../accounts/account.schema'
import { cardProduct, movementAmount, movementCurrency } from '../accounts/card-currency'
import { assetsAndLiabilities } from '../balances/compute-balances'
import { getBalances } from '../balances/get-balances'
import { shiftDay } from '../calendar/calendar-days.ts'
import { listExpectedIncomes } from '../expected-incomes/list-expected-incomes'
import { recurringExpense } from '../recurring-expenses/recurring-expense.schema'
import { listGoals } from '../savings-goals/list-goals'
import { savingsContribution } from '../savings-goals/savings-goal.schema'
import { requireSettings } from '../settings/get-settings'
import { transaction } from '../transactions/transaction.schema'
import { futureShares, monthOf, monthsBetween } from '../transactions/installments'
import { incomePeriod } from './income-period'
import {
  billsDueCents,
  goalReservationCents,
  monthSpentCents,
  safeToSpend,
  yearlySetAsideCents,
} from './safe-to-spend'
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

  // The period ends at the next payday when there is one before the end of the month: the money
  // that arrives during the period is part of what the days can be spent on.
  const incomes = await listExpectedIncomes(db, userId)
  const period = incomePeriod(
    today,
    month.end,
    incomes
      .filter((income) => income.currency === currency)
      .map((income) => ({ amountCents: toCents(income.amount), nextOn: income.nextOn })),
  )

  const balances = await getBalances(db, userId)
  const totals = assetsAndLiabilities(balances).find((total) => total.currency === currency)
  const inHandCents = (totals?.assetsCents ?? 0) - (totals?.liabilitiesCents ?? 0)

  // An expense the user spread over several months: the money already left the account, but the
  // months that have not come yet are still the user's. A foreign card charge weighs its value in
  // the card's currency, the same one its debt sits in.
  const installments = await db
    .select({
      amountCents: movementAmount,
      months: transaction.installmentMonths,
      occurredAt: transaction.occurredAt,
    })
    .from(transaction)
    .leftJoin(card, eq(card.id, transaction.cardId))
    .leftJoin(cardProduct, eq(cardProduct.id, card.productId))
    .where(
      and(
        eq(transaction.userId, userId),
        eq(transaction.type, 'expense'),
        eq(movementCurrency, currency),
        isNotNull(transaction.installmentMonths),
        lt(transaction.occurredAt, startOfDayIn(settings.timezone, shiftDay(today, 1))),
      ),
    )
  const currentMonth = today.slice(0, 7)
  const futureCents = installments.reduce(
    (sum, item) =>
      sum +
      futureShares(
        item.amountCents,
        item.months!,
        monthsBetween(monthOf(item.occurredAt, settings.timezone), currentMonth),
      ),
    0,
  )

  // The bills still to be paid: every occurrence before the period ends, plus an overdue bill,
  // whose date still waits to be confirmed. A weekly bill can fall twice; both count.
  const bills = await db
    .select({
      amountCents: recurringExpense.amountCents,
      startsOn: recurringExpense.startsOn,
      nextDueOn: recurringExpense.nextDueOn,
      frequency: recurringExpense.frequency,
    })
    .from(recurringExpense)
    .where(
      and(
        eq(recurringExpense.userId, userId),
        eq(recurringExpense.active, true),
        eq(recurringExpense.currency, currency),
      ),
    )
  const pendingBillsCents = billsDueCents(bills, today, period.end)

  // What the user already spent this month. Transfers and adjustments are not expenses (design D3).
  // The month is the calendar month, not the period: a payday in the next month does not move it.
  // A spread expense weighs its share of this month, never the whole purchase: that is the same
  // share the money above adds back for the months that have not come. A foreign card charge counts
  // its value in the card's currency, like its debt.
  const monthStart = `${today.slice(0, 8)}01`
  const monthExpenses = await db
    .select({
      amountCents: movementAmount,
      months: transaction.installmentMonths,
      occurredAt: transaction.occurredAt,
    })
    .from(transaction)
    .leftJoin(card, eq(card.id, transaction.cardId))
    .leftJoin(cardProduct, eq(cardProduct.id, card.productId))
    .where(
      and(
        eq(transaction.userId, userId),
        eq(transaction.type, 'expense'),
        eq(movementCurrency, currency),
        or(
          gte(transaction.occurredAt, startOfDayIn(settings.timezone, monthStart)),
          isNotNull(transaction.installmentMonths),
        ),
      ),
    )
  const spentCents = monthSpentCents(monthExpenses, settings.timezone, currentMonth)

  // The money already put aside stays in the accounts, so it is in the money in hand: it has to be
  // held back in full, not just this month's share. A yearly bill holds the twelfths its cycle has
  // earned so far; a savings goal not yet reached holds what it already has, plus what this month's share still lacks. One yearly
  // bill due before the period ends is a pending bill above, so it is not held twice.
  // What each goal received this month: the month's share is the one it started with, so a share
  // already saved this month is not asked for again.
  const savedThisMonth = new Map(
    (
      await db
        .select({ goalId: savingsContribution.goalId, cents: sum(savingsContribution.amountCents) })
        .from(savingsContribution)
        .where(and(eq(savingsContribution.userId, userId), gte(savingsContribution.contributedOn, monthStart)))
        .groupBy(savingsContribution.goalId)
    ).map((row) => [row.goalId, Number(row.cents ?? 0)]),
  )
  const setAsidesCents =
    yearlySetAsideCents(
      bills.filter((bill) => bill.frequency === 'yearly'),
      period.end,
      currentMonth,
    ) +
    (await listGoals(db, userId))
      .filter((goal) => goal.currency === currency)
      .reduce(
        (total, goal) =>
          total +
          goalReservationCents({
            targetCents: toCents(goal.target),
            contributedCents: toCents(goal.contributed),
            contributedThisMonthCents: savedThisMonth.get(goal.id) ?? 0,
            monthsLeft: goal.monthsLeft,
          }),
        0,
      )

  const result = safeToSpend({
    // The money in hand, plus what arrives before the period ends, plus the months of a spread
    // expense that have not come yet.
    availableCents: inHandCents + period.expectedCents + futureCents,
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
    expectedIncome: fromCents(period.expectedCents),
    futureInstallments: fromCents(futureCents),
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
