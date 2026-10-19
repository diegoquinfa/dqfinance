import { z } from 'zod'
import type { Db } from '../../db'
import { bank } from './account.schema'

export const createBankInput = z.object({
  name: z.string().trim().min(1).max(80),
})

export async function createBank(db: Db, userId: string, input: z.infer<typeof createBankInput>) {
  const [row] = await db.insert(bank).values({ userId, name: input.name }).returning()
  return row!
}
