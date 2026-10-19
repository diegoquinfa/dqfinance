import { z } from 'zod'
import type { Db } from '../../db'
import { COUNTERPARTY_KINDS, counterparty } from './counterparty.schema'

export const createCounterpartyInput = z.object({
  name: z.string().trim().min(1).max(80),
  kind: z.enum(COUNTERPARTY_KINDS).describe('person (a friend, a relative) or business (a store, a service)'),
})

export async function createCounterparty(db: Db, userId: string, input: z.infer<typeof createCounterpartyInput>) {
  const [row] = await db.insert(counterparty).values({ userId, ...input }).returning()
  return { id: row!.id, name: row!.name, kind: row!.kind }
}
