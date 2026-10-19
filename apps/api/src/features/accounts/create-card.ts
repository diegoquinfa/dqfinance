import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { found } from '../../shared/http'
import { moneyAmount, toCents } from '../../shared/money'
import { CARD_KINDS, card, product } from './account.schema'

const dayOfMonth = z.number().int().min(1).max(31)

export const createCardInput = z.object({
  productId: z.string().min(1),
  kind: z.enum(CARD_KINDS),
  name: z.string().trim().min(1).max(80),
  last4: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  // Credit cards only; in the product's currency.
  creditLimit: moneyAmount.optional(),
  statementDay: dayOfMonth.optional(),
  dueDay: dayOfMonth.optional(),
})

export async function createCard(db: Db, userId: string, input: z.infer<typeof createCardInput>) {
  found(
    await db
      .select({ id: product.id })
      .from(product)
      .where(and(eq(product.id, input.productId), eq(product.userId, userId)))
      .get(),
    'product_not_found',
  )
  const isCredit = input.kind === 'credit'
  const [row] = await db
    .insert(card)
    .values({
      userId,
      productId: input.productId,
      kind: input.kind,
      name: input.name,
      last4: input.last4,
      creditLimitCents: isCredit && input.creditLimit ? toCents(input.creditLimit) : null,
      statementDay: isCredit ? input.statementDay : null,
      dueDay: isCredit ? input.dueDay : null,
    })
    .returning()
  return row!
}
