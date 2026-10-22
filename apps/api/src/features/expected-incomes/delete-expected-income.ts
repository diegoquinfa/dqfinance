import { and, eq } from 'drizzle-orm'
import type { Db } from '../../db'
import { found } from '../../shared/http'
import { expectedIncome } from './expected-income.schema'

/** Deletes an expected income. The movements it produced stay. */
export async function deleteExpectedIncome(db: Db, userId: string, id: string) {
  found(
    await db
      .select({ id: expectedIncome.id })
      .from(expectedIncome)
      .where(and(eq(expectedIncome.id, id), eq(expectedIncome.userId, userId)))
      .get(),
    'expected_income_not_found',
  )
  await db.delete(expectedIncome).where(and(eq(expectedIncome.id, id), eq(expectedIncome.userId, userId)))
  return { id, deleted: true }
}
