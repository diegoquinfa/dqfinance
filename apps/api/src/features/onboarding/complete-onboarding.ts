import * as m from '@dqfinance/i18n/messages'
import { z } from 'zod'
import type { Db } from '../../db'
import { isTimeZone } from '../../shared/dates'
import { AppError } from '../../shared/http'
import { currencyCode } from '../../shared/money'
import { cashWallet } from '../accounts/account.schema'
import { category, SYSTEM_CATEGORY_KEYS } from '../categories/category.schema'
import { defaultCategoryRows } from '../categories/default-categories'
import { SYSTEM_KINDS } from '../categories/system-categories'
import { getSettings } from '../settings/get-settings'
import { LOCALES, userCurrency, userSettings } from '../settings/settings.schema'

export const completeOnboardingInput = z.object({
  country: z
    .string()
    .regex(/^[A-Za-z]{2}$/)
    .toUpperCase(),
  locale: z.enum(LOCALES),
  timezone: z.string().refine(isTimeZone, 'Unknown IANA timezone'),
  primaryCurrency: currencyCode,
  // Extra currencies besides the primary one.
  currencies: z.array(currencyCode).max(20),
})

/** Wizard result: settings, currencies, starter categories, and a cash wallet, written together. */
export async function completeOnboarding(db: Db, userId: string, input: z.infer<typeof completeOnboardingInput>) {
  if (await getSettings(db, userId)) throw new AppError('already_onboarded', 409)
  const codes = [...new Set([input.primaryCurrency, ...input.currencies])]
  await db.batch([
    db.insert(userSettings).values({
      userId,
      country: input.country,
      locale: input.locale,
      timezone: input.timezone,
      primaryCurrency: input.primaryCurrency,
      onboardedAt: new Date(),
    }),
    db.insert(userCurrency).values(codes.map((code) => ({ userId, code }))),
    db.insert(category).values([
      ...defaultCategoryRows(userId, input.locale),
      ...SYSTEM_CATEGORY_KEYS.map((systemKey) => ({ userId, systemKey, kind: SYSTEM_KINDS[systemKey] })),
    ]),
    db.insert(cashWallet).values({
      userId,
      name: m.cash_wallet_default_name({}, { locale: input.locale }),
      currency: input.primaryCurrency,
    }),
  ])
  return getSettings(db, userId)
}
