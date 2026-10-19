import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { AppError, found } from '../../shared/http'
import { currencyCode } from '../../shared/money'
import { assertCurrencyEnabled } from '../settings/get-settings'
import { PRODUCT_TYPES, YIELD_PAYOUTS, product } from './account.schema'
import { pocketUpdateError } from './pocket-rules'
import { rateBps } from './rate-bps'

export const updateProductInput = z.object({
  type: z.enum(PRODUCT_TYPES).optional(),
  name: z.string().trim().min(1).max(80).optional(),
  currency: currencyCode.optional(),
  annualRateBps: rateBps.nullable().optional(),
  yieldPayout: z.enum(YIELD_PAYOUTS).nullable().optional(),
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
  // A product with pockets inside it keeps its currency: the pockets are in the parent's currency.
  const hasPockets =
    existing.type !== 'pocket' &&
    (await db
      .select({ id: product.id })
      .from(product)
      .where(and(eq(product.parentProductId, id), eq(product.userId, userId)))
      .get()) !== undefined
  const error = pocketUpdateError(existing, input, hasPockets)
  if (error) throw new AppError(error, 400)
  const [row] = await db
    .update(product)
    .set(input)
    .where(and(eq(product.id, id), eq(product.userId, userId)))
    .returning()
  return row!
}
