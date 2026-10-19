import { asc, eq } from 'drizzle-orm'
import type { Db } from '../../db'
import { bank, bankAccount, card, cashWallet, product } from './account.schema'
import { buildAccountsTree } from './accounts-tree'

/** Everything the user owns, as a tree: bank → account → product → cards, plus cash wallets. */
export async function listAccounts(db: Db, userId: string) {
  const [banks, accounts, products, cards, wallets] = await Promise.all([
    db.select().from(bank).where(eq(bank.userId, userId)).orderBy(asc(bank.createdAt)),
    db.select().from(bankAccount).where(eq(bankAccount.userId, userId)).orderBy(asc(bankAccount.createdAt)),
    db.select().from(product).where(eq(product.userId, userId)).orderBy(asc(product.createdAt)),
    db.select().from(card).where(eq(card.userId, userId)).orderBy(asc(card.createdAt)),
    db.select().from(cashWallet).where(eq(cashWallet.userId, userId)).orderBy(asc(cashWallet.createdAt)),
  ])
  return buildAccountsTree({ banks, accounts, products, cards, wallets })
}

export type AccountsTree = Awaited<ReturnType<typeof listAccounts>>
