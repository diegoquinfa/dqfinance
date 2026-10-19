import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { found } from '../../shared/http'
import { bank, bankAccount } from './account.schema'

export const createBankAccountInput = z.object({
  bankId: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  last4: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
})

export async function createBankAccount(db: Db, userId: string, input: z.infer<typeof createBankAccountInput>) {
  found(
    await db
      .select({ id: bank.id })
      .from(bank)
      .where(and(eq(bank.id, input.bankId), eq(bank.userId, userId)))
      .get(),
    'bank_not_found',
  )
  const [row] = await db.insert(bankAccount).values({ userId, ...input }).returning()
  return row!
}
