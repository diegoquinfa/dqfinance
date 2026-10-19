import { z } from 'zod'
import type { Db } from '../../db'
import { currencyCode } from '../../shared/money'
import { assertCurrencyEnabled } from '../settings/get-settings'
import { cashWallet } from './account.schema'

export const createCashWalletInput = z.object({
  name: z.string().trim().min(1).max(80),
  currency: currencyCode,
})

export async function createCashWallet(db: Db, userId: string, input: z.infer<typeof createCashWalletInput>) {
  await assertCurrencyEnabled(db, userId, input.currency)
  const [row] = await db.insert(cashWallet).values({ userId, ...input }).returning()
  return row!
}
