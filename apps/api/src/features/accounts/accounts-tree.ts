import { fromCents } from '../../shared/money.ts'
import type { bank, bankAccount, card, cashWallet, product } from './account.schema.ts'

type BankRow = typeof bank.$inferSelect
type BankAccountRow = typeof bankAccount.$inferSelect
type ProductRow = typeof product.$inferSelect
type CardRow = typeof card.$inferSelect
type CashWalletRow = typeof cashWallet.$inferSelect

/** The fields every product shows, a pocket included. */
const productView = (p: ProductRow) => ({
  id: p.id,
  type: p.type,
  name: p.name,
  currency: p.currency,
  annualRateBps: p.annualRateBps,
  parentProductId: p.parentProductId,
  yieldPayout: p.yieldPayout,
})

/**
 * The tree of everything the user owns: bank → account → product → cards, plus cash wallets.
 * A pocket is not repeated in the account's products: it hangs under its parent (design D14).
 */
export function buildAccountsTree(rows: {
  banks: BankRow[]
  accounts: BankAccountRow[]
  products: ProductRow[]
  cards: CardRow[]
  wallets: CashWalletRow[]
}) {
  const { banks, accounts, products, cards, wallets } = rows
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
            .filter((p) => p.bankAccountId === a.id && p.parentProductId === null)
            .map((p) => ({
              ...productView(p),
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
                  brand: c.brand,
                  interestRateBps: c.interestRateBps,
                  interestRatePeriod: c.interestRatePeriod,
                  color: c.color,
                })),
              // The pockets inside this product, in the order they were created.
              pockets: products
                .filter((pocket) => pocket.parentProductId === p.id)
                .map((pocket) => ({ ...productView(pocket), cards: [] })),
            })),
        })),
    })),
    cashWallets: wallets.map((w) => ({ id: w.id, name: w.name, currency: w.currency })),
  }
}
