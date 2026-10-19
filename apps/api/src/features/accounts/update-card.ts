import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { found } from '../../shared/http'
import { moneyAmount, toCents } from '../../shared/money'
import { card } from './account.schema'
import { cardDetails } from './create-card'

const dayOfMonth = z.number().int().min(1).max(31)

export const updateCardInput = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  last4: z
    .string()
    .regex(/^\d{4}$/)
    .nullish(),
  creditLimit: moneyAmount.nullish().describe("Credit cards only, in the card's currency"),
  statementDay: dayOfMonth.nullish(),
  dueDay: dayOfMonth.nullish(),
  ...cardDetails,
})

export async function updateCard(db: Db, userId: string, id: string, input: z.infer<typeof updateCardInput>) {
  const existing = found(
    await db
      .select()
      .from(card)
      .where(and(eq(card.id, id), eq(card.userId, userId)))
      .get(),
    'card_not_found',
  )
  if (Object.keys(input).length === 0) return existing
  const { creditLimit, ...rest } = input
  const creditLimitCents = creditLimit === undefined ? undefined : creditLimit === null ? null : toCents(creditLimit)
  const [row] = await db
    .update(card)
    .set({ ...rest, creditLimitCents })
    .where(and(eq(card.id, id), eq(card.userId, userId)))
    .returning()
  return row!
}
