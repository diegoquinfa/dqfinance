import { asc, eq } from 'drizzle-orm'
import type { Db } from '../../db'
import { fromCents } from '../../shared/money'
import { bank, bankAccount, card, cashWallet, product } from './account.schema'

/** Everything the user owns, as a tree: bank → account → product → cards, plus cash wallets. */
export async function listAccounts(db: Db, userId: string) {
  const [banks, accounts, products, cards, wallets] = await Promise.all([
    db.select().from(bank).where(eq(bank.userId, userId)).orderBy(asc(bank.createdAt)),
    db.select().from(bankAccount).where(eq(bankAccount.userId, userId)).orderBy(asc(bankAccount.createdAt)),
    db.select().from(product).where(eq(product.userId, userId)).orderBy(asc(product.createdAt)),
    db.select().from(card).where(eq(card.userId, userId)).orderBy(asc(card.createdAt)),
    db.select().from(cashWallet).where(eq(cashWallet.userId, userId)).orderBy(asc(cashWallet.createdAt)),
  ])
  return {
    banks: banks.map((b) => ({
      id: b.id,
      name: b.name,
      accounts: accounts
        .filter((a) => a.bankId === b.id)
        .map((a) => ({
          id: a.id,
          name: a.name,
          last4: a.last4,
          products: products
            .filter((p) => p.bankAccountId === a.id)
            .map((p) => ({
              id: p.id,
              type: p.type,
              name: p.name,
              currency: p.currency,
              cards: cards
                .filter((c) => c.productId === p.id)
                .map((c) => ({
                  id: c.id,
                  kind: c.kind,
                  name: c.name,
                  last4: c.last4,
                  currency: p.currency,
                  creditLimit: c.creditLimitCents === null ? null : fromCents(c.creditLimitCents),
                  statementDay: c.statementDay,
                  dueDay: c.dueDay,
                })),
            })),
        })),
    })),
    cashWallets: wallets.map((w) => ({ id: w.id, name: w.name, currency: w.currency })),
  }
}

export type AccountsTree = Awaited<ReturnType<typeof listAccounts>>
