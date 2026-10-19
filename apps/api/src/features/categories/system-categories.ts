import * as m from '@dqfinance/i18n/messages'
import { and, eq } from 'drizzle-orm'
import type { Db } from '../../db'
import type { Locale } from '../../shared/locale'
import { category, type SystemCategoryKey } from './category.schema'

const SYSTEM_KINDS: Record<SystemCategoryKey, 'expense' | 'income'> = {
  fx_loss: 'expense',
  fx_gain: 'income',
  bank_fees: 'expense',
}

/** Display name: stored name for user categories, translated name for system ones. */
export const categoryName = (row: { name: string | null; systemKey: SystemCategoryKey | null }, locale: Locale) =>
  row.systemKey ? m[`category_${row.systemKey}`]({}, { locale }) : row.name!

/** Id of a system category, creating it on first use. */
export async function systemCategoryId(db: Db, userId: string, key: SystemCategoryKey) {
  await db
    .insert(category)
    .values({ userId, kind: SYSTEM_KINDS[key], systemKey: key })
    .onConflictDoNothing()
  const row = await db
    .select({ id: category.id })
    .from(category)
    .where(and(eq(category.userId, userId), eq(category.systemKey, key)))
    .get()
  return row!.id
}
