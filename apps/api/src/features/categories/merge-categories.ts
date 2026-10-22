import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { AppError, found } from '../../shared/http'
import { budget } from '../budgets/budget.schema'
import { recurringExpense } from '../recurring-expenses/recurring-expense.schema'
import { transaction } from '../transactions/transaction.schema'
import { budgetMerge, mergeBlock, type MergeBlock } from './category-merge-rules'
import { category } from './category.schema'

export const mergeCategoriesInput = z.object({
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
})

/**
 * Merges a category into another one of the same kind: its movements, its recurring expenses and its
 * budget move over and it disappears. There is one budget per category, so when the target already
 * has one, the target's limit wins and the source's is dropped. A system category is booked
 * automatically, so it stays: it never merges, as source or as target. A category of another user is
 * not found.
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
  if (source.systemKey || target.systemKey) throw new AppError('category_system')
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
  const budgets = await db
    .select({ categoryId: budget.categoryId })
    .from(budget)
    .where(and(eq(budget.userId, userId), inArray(budget.categoryId, [source.id, target.id])))
  const budgetAction = budgetMerge(
    budgets.some((row) => row.categoryId === source.id),
    budgets.some((row) => row.categoryId === target.id),
  )
  const sourceBudget = and(eq(budget.categoryId, source.id), eq(budget.userId, userId))
  // Every reference moves and the category goes in one batch, so the category never disappears with
  // something still pointing at it. With no source budget the budget update matches no row.
  await db.batch([
    db
      .update(transaction)
      .set({ categoryId: target.id })
      .where(and(eq(transaction.categoryId, source.id), eq(transaction.userId, userId))),
    db
      .update(recurringExpense)
      .set({ categoryId: target.id })
      .where(and(eq(recurringExpense.categoryId, source.id), eq(recurringExpense.userId, userId))),
    budgetAction === 'drop'
      ? db.delete(budget).where(sourceBudget)
      : db.update(budget).set({ categoryId: target.id }).where(sourceBudget),
    db.delete(category).where(and(eq(category.id, source.id), eq(category.userId, userId))),
  ])
  return { id: target.id, name: target.name!, kind: target.kind, moved: movements.length }
}
