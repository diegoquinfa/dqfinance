import { and, asc, eq } from 'drizzle-orm'
import type { Db } from '../../db'
import { todayIn } from '../../shared/dates'
import { fromCents } from '../../shared/money'
import { requireSettings } from '../settings/get-settings'
import { expectedIncome } from './expected-income.schema'
import { nextIncomeDate } from './next-income-date'

/** What an expected income looks like to the web and to an agent. */
export type ExpectedIncomeView = {
  id: string
  name: string
  currency: string
  frequency: string
  /** When the next one arrives. */
  nextOn: string
  amount: number
}

/** The incomes the user expects, with the day each one next arrives. */
export async function listExpectedIncomes(db: Db, userId: string): Promise<ExpectedIncomeView[]> {
  const settings = await requireSettings(db, userId)
  const today = todayIn(settings.timezone)
  const rows = await db
    .select()
    .from(expectedIncome)
    .where(and(eq(expectedIncome.userId, userId), eq(expectedIncome.active, true)))
    .orderBy(asc(expectedIncome.nextOn))
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    currency: row.currency,
    frequency: row.frequency,
    nextOn: nextIncomeDate(row.frequency, row.nextOn, today),
    amount: fromCents(row.amountCents),
  }))
}
