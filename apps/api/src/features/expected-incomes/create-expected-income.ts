import { z } from 'zod'
import type { Db } from '../../db'
import { isoDate, todayIn } from '../../shared/dates'
import { currencyCode, fromCents, moneyAmount, toCents } from '../../shared/money'
import { assertCurrencyEnabled, requireSettings } from '../settings/get-settings'
import { expectedIncome } from './expected-income.schema'
import { INCOME_FREQUENCIES } from './income-frequency'

export const createExpectedIncomeInput = z.object({
  name: z.string().trim().min(1).max(60),
  amount: moneyAmount.describe('What it brings (decimal, not cents)'),
  currency: currencyCode.optional().describe("Defaults to the user's primary currency"),
  frequency: z.enum(INCOME_FREQUENCIES).describe('How often it arrives'),
  nextOn: isoDate.optional().describe('When the next one arrives (YYYY-MM-DD); defaults to today'),
})

export async function createExpectedIncome(db: Db, userId: string, input: z.infer<typeof createExpectedIncomeInput>) {
  const settings = await requireSettings(db, userId)
  const currency = input.currency ?? settings.primaryCurrency
  await assertCurrencyEnabled(db, userId, currency)
  const [row] = await db
    .insert(expectedIncome)
    .values({
      userId,
      name: input.name,
      amountCents: toCents(input.amount),
      currency,
      frequency: input.frequency,
      nextOn: input.nextOn ?? todayIn(settings.timezone),
    })
    .returning()
  return {
    id: row!.id,
    name: row!.name,
    currency: row!.currency,
    frequency: row!.frequency,
    nextOn: row!.nextOn,
    amount: fromCents(row!.amountCents),
  }
}
