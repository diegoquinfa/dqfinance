import { and, asc, eq } from 'drizzle-orm'
import type { Db } from '../../db'
import { todayIn } from '../../shared/dates'
import { fromCents } from '../../shared/money'
import { counterparty } from '../counterparties/counterparty.schema'
import { requireSettings } from '../settings/get-settings'
import { expectedIncome } from './expected-income.schema'
import type { IncomeFrequency } from './income-frequency'
import { nextIncomeDate } from './next-income-date'

/** What an expected income looks like to the web and to an agent. */
export type ExpectedIncomeView = {
  id: string
  name: string
  currency: string
  frequency: IncomeFrequency
  /** When the next one arrives. */
  nextOn: string
  amount: number
  /** Who pays it, when the user said so. */
  counterparty: { id: string; name: string } | null
}

/** The incomes the user expects, with the day each one next arrives. */
export async function listExpectedIncomes(db: Db, userId: string): Promise<ExpectedIncomeView[]> {
  const settings = await requireSettings(db, userId)
  const today = todayIn(settings.timezone)
  const rows = await db
    .select({ income: expectedIncome, counterpartyName: counterparty.name })
    .from(expectedIncome)
    // The join hangs off an id taken from the user's own income row, and the contact has to be
    // theirs too, so no other user's contact can be pulled in.
    .leftJoin(
      counterparty,
      and(eq(counterparty.id, expectedIncome.counterpartyId), eq(counterparty.userId, userId)),
    )
    .where(and(eq(expectedIncome.userId, userId), eq(expectedIncome.active, true)))
    .orderBy(asc(expectedIncome.nextOn))
  return rows.map(({ income: row, counterpartyName }) => ({
    id: row.id,
    name: row.name,
    currency: row.currency,
    frequency: row.frequency,
    nextOn: nextIncomeDate(row.frequency, row.nextOn, today),
    amount: fromCents(row.amountCents),
    counterparty: row.counterpartyId ? { id: row.counterpartyId, name: counterpartyName ?? '' } : null,
  }))
}
