import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { found } from '../../shared/http'
import { currencyCode } from '../../shared/money'
import { assertCurrencyEnabled } from '../settings/get-settings'
import { PRODUCT_TYPES, bankAccount, product } from './account.schema'

export const createProductInput = z.object({
  bankAccountId: z.string().min(1),
  type: z.enum(PRODUCT_TYPES),
  name: z.string().trim().min(1).max(80),
  currency: currencyCode,
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
  const [row] = await db.insert(product).values({ userId, ...input }).returning()
  return row!
}
