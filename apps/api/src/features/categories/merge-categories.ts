import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { AppError, found } from '../../shared/http'
import { transaction } from '../transactions/transaction.schema'
import { mergeBlock, type MergeBlock } from './category-merge-rules'
import { category } from './category.schema'

export const mergeCategoriesInput = z.object({
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
})

/**
 * Merges a category into another one of the same kind: its movements move over and it disappears.
 * A category of another user is not found.
 */
export async function mergeCategories(db: Db, userId: string, input: z.infer<typeof mergeCategoriesInput>) {
  const source = found(
    await db
      .select()
      .from(category)
      .where(and(eq(category.id, input.sourceId), eq(category.userId, userId)))
      .get(),
    'category_not_found',
  )
  const target = found(
    await db
      .select()
      .from(category)
      .where(and(eq(category.id, input.targetId), eq(category.userId, userId)))
      .get(),
    'category_not_found',
  )
  // A system category is booked automatically, so it stays.
  if (source.systemKey) throw new AppError('category_system')
  const block: MergeBlock | null = mergeBlock(
    { id: source.id, kind: source.kind },
    { id: target.id, kind: target.kind },
  )
  if (block === 'same') throw new AppError('category_merge_same')
  if (block === 'kind') throw new AppError('category_kind_mismatch')
  const movements = await db
    .select({ id: transaction.id })
    .from(transaction)
    .where(and(eq(transaction.categoryId, source.id), eq(transaction.userId, userId)))
  // The movements move and the category goes in one batch, so the category never disappears with
  // its movements still pointing at it.
  await db.batch([
    db
      .update(transaction)
      .set({ categoryId: target.id })
      .where(and(eq(transaction.categoryId, source.id), eq(transaction.userId, userId))),
    db.delete(category).where(and(eq(category.id, source.id), eq(category.userId, userId))),
  ])
  return { id: target.id, name: target.name!, kind: target.kind, moved: movements.length }
}
