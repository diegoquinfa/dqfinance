import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { found } from '../../shared/http'
import { currencyCode } from '../../shared/money'
import { assertCurrencyEnabled } from '../settings/get-settings'
import { PRODUCT_TYPES, product } from './account.schema'
import { rateBps } from './rate-bps'

export const updateProductInput = z.object({
  type: z.enum(PRODUCT_TYPES).optional(),
  name: z.string().trim().min(1).max(80).optional(),
  currency: currencyCode.optional(),
  annualRateBps: rateBps.nullable().optional(),
})

export async function updateProduct(db: Db, userId: string, id: string, input: z.infer<typeof updateProductInput>) {
  const existing = found(
    await db
      .select()
      .from(product)
      .where(and(eq(product.id, id), eq(product.userId, userId)))
      .get(),
    'product_not_found',
  )
  if (Object.keys(input).length === 0) return existing
  if (input.currency) await assertCurrencyEnabled(db, userId, input.currency)
  const [row] = await db
    .update(product)
    .set(input)
    .where(and(eq(product.id, id), eq(product.userId, userId)))
    .returning()
  return row!
}
