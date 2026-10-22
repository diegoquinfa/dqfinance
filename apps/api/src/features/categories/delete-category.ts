import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { AppError, found } from '../../shared/http'
import { transaction } from '../transactions/transaction.schema'
import { category } from './category.schema'

export const deleteCategoryInput = z.object({ id: z.string().min(1) })

/**
 * Deletes a category that has no movements. One that has them cannot go: a movement always carries
 * a category, so it would be left without one. Merging it into another category is the way out.
 * A category of another user is not found.
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
  if (used.length > 0) throw new AppError('category_has_transactions')
  await db.delete(category).where(and(eq(category.id, id), eq(category.userId, userId)))
  return { id, deleted: true }
}
