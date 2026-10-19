import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { found } from '../../shared/http'
import { moneyAmount, toCents } from '../../shared/money'
import { CARD_BRANDS, CARD_COLORS, CARD_KINDS, INTEREST_RATE_PERIODS, card, product } from './account.schema'
import { rateBps } from './rate-bps'

const dayOfMonth = z.number().int().min(1).max(31)

/** What a card can carry, beyond its kind and name; shared by create and update. */
export const cardDetails = {
  brand: z.enum(CARD_BRANDS).nullish(),
  interestRateBps: rateBps
    .nullish()
    .describe('The rate the issuer charges, in basis points (10000 = 100%). Null for no rate.'),
  interestRatePeriod: z.enum(INTEREST_RATE_PERIODS).nullish().describe('`monthly` (MV) or `annual` (EA)'),
  color: z.enum(CARD_COLORS).nullish().describe('Presentation only'),
}

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
  ...cardDetails,
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
      brand: input.brand ?? null,
      // The rate is what the issuer charges on debt, so it belongs to a credit card only.
      interestRateBps: isCredit ? (input.interestRateBps ?? null) : null,
      interestRatePeriod: isCredit ? (input.interestRatePeriod ?? null) : null,
      color: input.color ?? null,
    })
    .returning()
  return row!
}
