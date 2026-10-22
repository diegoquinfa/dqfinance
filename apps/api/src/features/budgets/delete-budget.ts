import { and, eq } from 'drizzle-orm'
import type { Db } from '../../db'
import { found } from '../../shared/http'
import { budget } from './budget.schema'

/** Removes the limit of a category. The movements it counted stay. */
export async function deleteBudget(db: Db, userId: string, id: string) {
  found(
    await db
      .select({ id: budget.id })
      .from(budget)
      .where(and(eq(budget.id, id), eq(budget.userId, userId)))
      .get(),
    'budget_not_found',
  )
  await db.delete(budget).where(and(eq(budget.id, id), eq(budget.userId, userId)))
  return { id, deleted: true }
}
