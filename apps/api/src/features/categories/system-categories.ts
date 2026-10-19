import { and, eq } from 'drizzle-orm'
import type { Db } from '../../db'
import { category, type SystemCategoryKey } from './category.schema.ts'

export const SYSTEM_KINDS: Record<SystemCategoryKey, 'expense' | 'income'> = {
  fx_loss: 'expense',
  fx_gain: 'income',
  bank_fees: 'expense',
  other_expense: 'expense',
  other_income: 'income',
}

export { categoryName } from './category-display.ts'

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
