import { and, eq, notInArray } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { AppError } from '../../shared/http'
import { currencyCode } from '../../shared/money'
import { requireSettings } from './get-settings'
import { LOCALES, userCurrency, userSettings } from './settings.schema'

export const updateSettingsInput = z.object({
  locale: z.enum(LOCALES).optional(),
  // The full list of the user's currencies; must keep the primary one.
  currencies: z.array(currencyCode).min(1).optional(),
})

export async function updateSettings(db: Db, userId: string, input: z.infer<typeof updateSettingsInput>) {
  const settings = await requireSettings(db, userId)
  if (input.locale) {
    await db.update(userSettings).set({ locale: input.locale }).where(eq(userSettings.userId, userId))
  }
  if (input.currencies) {
    const codes = [...new Set(input.currencies)]
    if (!codes.includes(settings.primaryCurrency)) throw new AppError('primary_currency_required')
    await db.batch([
      db.delete(userCurrency).where(and(eq(userCurrency.userId, userId), notInArray(userCurrency.code, codes))),
      db
        .insert(userCurrency)
        .values(codes.map((code) => ({ userId, code })))
        .onConflictDoNothing(),
    ])
  }
  return requireSettings(db, userId)
}
