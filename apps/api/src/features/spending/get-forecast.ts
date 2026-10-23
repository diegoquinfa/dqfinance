import { and, eq, lte } from 'drizzle-orm'
import type { Db } from '../../db'
import { todayIn } from '../../shared/dates'
import { fromCents, toCents } from '../../shared/money'
import { assetsAndLiabilities } from '../balances/compute-balances'
import { getBalances } from '../balances/get-balances'
import { shiftDay } from '../calendar/calendar-days.ts'
import { listExpectedIncomes } from '../expected-incomes/list-expected-incomes'
import { incomeDatesIn } from '../expected-incomes/next-income-date.ts'
import { recurringExpense } from '../recurring-expenses/recurring-expense.schema'
import { requireSettings } from '../settings/get-settings'
import { billOccurrences } from './bill-occurrences.ts'
import { projectBalances, type ForecastDay } from './forecast'
import { monthPeriod } from './spending-period'

/**
 * The balance of each day until the end of the month, and the day it is lowest. Only what is known
 * moves the line: the recurring expenses and the incomes the user expects.
 */
export async function getForecast(db: Db, userId: string) {
  const settings = await requireSettings(db, userId)
  const currency = settings.primaryCurrency
  const today = todayIn(settings.timezone)
  const month = monthPeriod(today)

  const balances = await getBalances(db, userId)
  const totals = assetsAndLiabilities(balances).find((total) => total.currency === currency)
  const startCents = (totals?.assetsCents ?? 0) - (totals?.liabilitiesCents ?? 0)

  // What each day of the period brings and takes.
  const expenseByDay = new Map<string, number>()
  const incomeByDay = new Map<string, number>()
  const add = (map: Map<string, number>, day: string, cents: number) =>
    map.set(day, (map.get(day) ?? 0) + cents)

  const bills = await db
    .select({
      startsOn: recurringExpense.startsOn,
      nextDueOn: recurringExpense.nextDueOn,
      frequency: recurringExpense.frequency,
      amountCents: recurringExpense.amountCents,
    })
    .from(recurringExpense)
    .where(
      and(
        eq(recurringExpense.userId, userId),
        eq(recurringExpense.active, true),
        eq(recurringExpense.currency, currency),
        lte(recurringExpense.nextDueOn, month.end),
      ),
    )
  for (const bill of bills) {
    for (const occurrence of billOccurrences(bill, today, month.end)) {
      add(expenseByDay, occurrence.day, occurrence.amountCents)
    }
  }

  const incomes = (await listExpectedIncomes(db, userId)).filter((income) => income.currency === currency)
  for (const income of incomes) {
    // An irregular income arrives once; the recurring ones on each date they fall due.
    for (const day of incomeDatesIn(income.frequency, income.nextOn, income.nextOn, month.end)) {
      add(incomeByDay, day, toCents(income.amount))
    }
  }

  const days: ForecastDay[] = []
  for (let day = today; day <= month.end; day = shiftDay(day, 1)) {
    days.push({
      day,
      incomeCents: incomeByDay.get(day) ?? 0,
      expenseCents: expenseByDay.get(day) ?? 0,
    })
  }

  const { points, lowest } = projectBalances(startCents, days)
  return {
    currency,
    day: today,
    periodEnd: month.end,
    days: points.map((point) => ({ day: point.day, balance: fromCents(point.balanceCents) })),
    lowest: lowest ? { day: lowest.day, balance: fromCents(lowest.balanceCents) } : null,
  }
}
