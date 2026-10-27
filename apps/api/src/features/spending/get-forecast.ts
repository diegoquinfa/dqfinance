import { and, eq, gte, isNotNull, isNull, lt, lte, sql } from 'drizzle-orm'
import type { Db } from '../../db'
import { todayIn } from '../../shared/dates'
import { startOfDayIn } from '../../shared/day-range.ts'
import { fromCents, toCents } from '../../shared/money'
import { card } from '../accounts/account.schema'
import { cardProduct, movementAmount, movementCurrency } from '../accounts/card-currency'
import { assetsAndLiabilities } from '../balances/compute-balances'
import { getBalances } from '../balances/get-balances'
import { shiftDay } from '../calendar/calendar-days.ts'
import { listCardCycles } from '../card-statements/list-card-cycles'
import { listExpectedIncomes } from '../expected-incomes/list-expected-incomes'
import { incomeDatesIn } from '../expected-incomes/next-income-date.ts'
import { recurringExpense } from '../recurring-expenses/recurring-expense.schema'
import { requireSettings } from '../settings/get-settings'
import { transaction } from '../transactions/transaction.schema'
import { billOccurrences } from './bill-occurrences.ts'
import { dailyPaceCents, projectBalances, type ForecastDay } from './forecast'
import { monthSpentCents } from './safe-to-spend'
import { monthPeriod } from './spending-period'

/**
 * The balance of each day until the end of the month, and the day it is lowest. It starts from what
 * the accounts and wallets hold, like safe to spend (design D16). What is known moves the line: the
 * recurring expenses, the credit card statements on their payment day, and the incomes the user expects. What is not known is the
 * user's pace: this month's spending so far, divided by the days elapsed, spent each day after today.
 */
export async function getForecast(db: Db, userId: string) {
  const settings = await requireSettings(db, userId)
  const currency = settings.primaryCurrency
  const today = todayIn(settings.timezone)
  const month = monthPeriod(today)

  const balances = await getBalances(db, userId)
  const totals = assetsAndLiabilities(balances).find((total) => total.currency === currency)
  const startCents = totals?.assetsCents ?? 0

  // The pace is read on every request, summed by the database: a stored average would need a refresh
  // on every write path, while this is one indexed sum. A fixed bill is projected on its own dates,
  // so its movements are left out; a spread expense counts its share of this month, so only those
  // rows are loaded.
  const daysElapsed = Number(today.slice(8))
  const monthStart = `${today.slice(0, 8)}01`
  const tomorrowStart = startOfDayIn(settings.timezone, shiftDay(today, 1))
  const ordinary = await db
    .select({ cents: sql<number>`coalesce(sum(${movementAmount}), 0)` })
    .from(transaction)
    .leftJoin(card, eq(card.id, transaction.cardId))
    .leftJoin(cardProduct, eq(cardProduct.id, card.productId))
    .where(
      and(
        eq(transaction.userId, userId),
        eq(transaction.type, 'expense'),
        eq(movementCurrency, currency),
        isNull(transaction.recurringExpenseId),
        isNull(transaction.installmentMonths),
        gte(transaction.occurredAt, startOfDayIn(settings.timezone, monthStart)),
        lt(transaction.occurredAt, tomorrowStart),
      ),
    )
  const spread = await db
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
        isNull(transaction.recurringExpenseId),
        isNotNull(transaction.installmentMonths),
        lt(transaction.occurredAt, tomorrowStart),
      ),
    )
  const currentMonth = today.slice(0, 7)
  const spentCents = Number(ordinary[0]?.cents ?? 0) + monthSpentCents(spread, settings.timezone, currentMonth)
  const dailyAverageCents = dailyPaceCents(spentCents, daysElapsed)

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

  // What a statement still asks for leaves on its payment day; an overdue one leaves today.
  for (const owned of await listCardCycles(db, userId, today, settings.timezone)) {
    if (owned.currency !== currency || !owned.statement?.remainingCents) continue
    const day = owned.statement.dueOn < today ? today : owned.statement.dueOn
    if (day <= month.end) add(expenseByDay, day, owned.statement.remainingCents)
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

  const { points, lowest } = projectBalances(startCents, days, { today, dailyCents: dailyAverageCents })
  return {
    currency,
    day: today,
    periodEnd: month.end,
    dailyAverage: fromCents(dailyAverageCents),
    daysElapsed,
    days: points.map((point) => ({ day: point.day, balance: fromCents(point.balanceCents) })),
    lowest: lowest ? { day: lowest.day, balance: fromCents(lowest.balanceCents) } : null,
  }
}
