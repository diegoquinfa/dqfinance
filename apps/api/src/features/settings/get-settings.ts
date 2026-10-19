import { asc, eq } from 'drizzle-orm'
import type { Db } from '../../db'
import { AppError } from '../../shared/http'
import { userCurrency, userSettings } from './settings.schema'

export type Settings = typeof userSettings.$inferSelect & { currencies: string[] }

/** The user's settings, or null before onboarding. */
export async function getSettings(db: Db, userId: string): Promise<Settings | null> {
  const [settings, currencies] = await Promise.all([
    db.select().from(userSettings).where(eq(userSettings.userId, userId)).get(),
    db.select().from(userCurrency).where(eq(userCurrency.userId, userId)).orderBy(asc(userCurrency.createdAt)),
  ])
  return settings ? { ...settings, currencies: currencies.map((c) => c.code) } : null
}

/** Like getSettings, but every money operation needs onboarding done first. */
export async function requireSettings(db: Db, userId: string): Promise<Settings> {
  const settings = await getSettings(db, userId)
  if (!settings) throw new AppError('onboarding_required', 409)
  return settings
}

export async function assertCurrencyEnabled(db: Db, userId: string, currency: string) {
  const { currencies } = await requireSettings(db, userId)
  if (!currencies.includes(currency)) throw new AppError('currency_not_enabled')
}
