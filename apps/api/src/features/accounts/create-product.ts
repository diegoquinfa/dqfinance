import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { AppError, found } from '../../shared/http'
import { currencyCode } from '../../shared/money'
import { assertCurrencyEnabled } from '../settings/get-settings'
import { PRODUCT_TYPES, YIELD_PAYOUTS, bankAccount, product } from './account.schema'
import { pocketCreateError } from './pocket-rules'
import { rateBps } from './rate-bps'

export const createProductInput = z.object({
  bankAccountId: z.string().min(1),
  type: z.enum(PRODUCT_TYPES),
  name: z.string().trim().min(1).max(80),
  currency: currencyCode,
  annualRateBps: rateBps
    .nullish()
    .describe('Effective annual rate in basis points (10000 = 100%); null for no rate'),
  parentProductId: z
    .string()
    .min(1)
    .nullish()
    .describe("The product this one sets money aside from; only for type 'pocket'."),
  yieldPayout: z
    .enum(YIELD_PAYOUTS)
    .nullish()
    .describe('How often interest is paid: daily or monthly.'),
})

export async function createProduct(db: Db, userId: string, input: z.infer<typeof createProductInput>) {
  found(
    await db
      .select({ id: bankAccount.id })
      .from(bankAccount)
      .where(and(eq(bankAccount.id, input.bankAccountId), eq(bankAccount.userId, userId)))
      .get(),
    'bank_account_not_found',
  )
  await assertCurrencyEnabled(db, userId, input.currency)
  // The parent is loaded with its own ownership filter: nobody else's product can become a parent.
  const parent = input.parentProductId
    ? await db
        .select({
          id: product.id,
          type: product.type,
          currency: product.currency,
          bankAccountId: product.bankAccountId,
        })
        .from(product)
        .where(and(eq(product.id, input.parentProductId), eq(product.userId, userId)))
        .get()
    : undefined
  const error = pocketCreateError(input, parent ?? null)
  if (error) throw new AppError(error, error === 'product_not_found' ? 404 : 400)
  const [row] = await db
    .insert(product)
    .values({
      userId,
      ...input,
      annualRateBps: input.annualRateBps ?? null,
      parentProductId: input.parentProductId ?? null,
      yieldPayout: input.yieldPayout ?? null,
    })
    .returning()
  return row!
}
