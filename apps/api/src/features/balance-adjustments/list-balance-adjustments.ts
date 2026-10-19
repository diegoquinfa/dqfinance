import { desc, eq } from 'drizzle-orm'
import type { Db } from '../../db'
import { fromCents } from '../../shared/money'
import { sourceRefOf } from '../accounts/source'
import { balanceAdjustment } from './balance-adjustment.schema'

export async function listBalanceAdjustments(db: Db, userId: string) {
  const rows = await db
    .select()
    .from(balanceAdjustment)
    .where(eq(balanceAdjustment.userId, userId))
    .orderBy(desc(balanceAdjustment.adjustedAt))
    .limit(100)
  return rows.map((row) => ({
    id: row.id,
    source: sourceRefOf(row),
    currency: row.currency,
    observedBalance: fromCents(row.observedBalanceCents),
    delta: fromCents(row.deltaCents),
    note: row.note,
    adjustedAt: row.adjustedAt.toISOString(),
  }))
}
