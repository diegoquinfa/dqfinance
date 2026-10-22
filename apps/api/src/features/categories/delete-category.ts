import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { AppError, found } from '../../shared/http'
import { recurringExpense } from '../recurring-expenses/recurring-expense.schema'
import { transaction } from '../transactions/transaction.schema'
import { category } from './category.schema'

export const deleteCategoryInput = z.object({ id: z.string().min(1) })

/**
 * Deletes a category nothing points at: no movement and no recurring expense may use it, because
 * both keep their category. Merging it into another category is the way out. A category of another
 * user is not found.
 */
export async function deleteCategory(db: Db, userId: string, id: string) {
  const existing = found(
    await db.select().from(category).where(and(eq(category.id, id), eq(category.userId, userId))).get(),
    'category_not_found',
  )
  if (existing.systemKey) throw new AppError('category_system')
  const used = await db
    .select({ id: transaction.id })
    .from(transaction)
    .where(and(eq(transaction.categoryId, id), eq(transaction.userId, userId)))
    .limit(1)
  const billed = await db
    .select({ id: recurringExpense.id })
    .from(recurringExpense)
    .where(and(eq(recurringExpense.categoryId, id), eq(recurringExpense.userId, userId)))
    .limit(1)
  if (used.length > 0) throw new AppError('category_has_transactions')
  if (billed.length > 0) throw new AppError('category_in_use', 409)
  await db.delete(category).where(and(eq(category.id, id), eq(category.userId, userId)))
  return { id, deleted: true }
}
