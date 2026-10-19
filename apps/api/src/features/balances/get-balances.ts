import { eq } from 'drizzle-orm'
import type { Db } from '../../db'
import { fromCents } from '../../shared/money'
import { bank, bankAccount, card, cashWallet, product } from '../accounts/account.schema'
import { balanceAdjustment } from '../balance-adjustments/balance-adjustment.schema'
import { transaction } from '../transactions/transaction.schema'
import { transfer } from '../transfers/transfer.schema'
import { computeBalances, type Balances, type Ledger } from './compute-balances'
import { estimateYield } from '../accounts/product-yield'

/**
 * Every movement of a user, as the pure balance core reads it.
 * shortcut: loads every movement and sums in memory; switch to SQL aggregates when a user has
 * tens of thousands of movements.
 */
export async function getLedger(db: Db, userId: string): Promise<Ledger> {
  const [products, cashWallets, cards, transactions, transfers, adjustments] = await Promise.all([
    db
      .select({
        id: product.id,
        name: product.name,
        bankName: bank.name,
        currency: product.currency,
        annualRateBps: product.annualRateBps,
      })
      .from(product)
      .innerJoin(bankAccount, eq(bankAccount.id, product.bankAccountId))
      .innerJoin(bank, eq(bank.id, bankAccount.bankId))
      .where(eq(product.userId, userId)),
    db
      .select({ id: cashWallet.id, name: cashWallet.name, currency: cashWallet.currency })
      .from(cashWallet)
      .where(eq(cashWallet.userId, userId)),
    db
      .select({
        id: card.id,
        name: card.name,
        kind: card.kind,
        productId: card.productId,
        currency: product.currency,
        creditLimitCents: card.creditLimitCents,
      })
      .from(card)
      .innerJoin(product, eq(product.id, card.productId))
      .where(eq(card.userId, userId)),
    db
      .select({
        type: transaction.type,
        amountCents: transaction.amountCents,
        currency: transaction.currency,
        primaryAmountCents: transaction.primaryAmountCents,
        productId: transaction.productId,
        cashWalletId: transaction.cashWalletId,
        cardId: transaction.cardId,
        occurredAt: transaction.occurredAt,
      })
      .from(transaction)
      .where(eq(transaction.userId, userId)),
    db.select().from(transfer).where(eq(transfer.userId, userId)),
    db.select().from(balanceAdjustment).where(eq(balanceAdjustment.userId, userId)),
  ])
  return { products, cashWallets, cards, transactions, transfers, adjustments }
}

/** Every balance, card debt, and in-transit amount of a user (in cents). */
export async function getBalances(db: Db, userId: string): Promise<Balances> {
  return computeBalances(await getLedger(db, userId))
}

/** Decimal amounts for HTTP and MCP responses. */
export const toBalancesView = (balances: Balances) => ({
  accounts: balances.accounts.map(({ balanceCents, annualRateBps, ...account }) => ({
    ...account,
    balance: fromCents(balanceCents),
    annualRateBps,
    // An estimate from the rate, never part of the balance (design D1/D2).
    estimatedYield: toYieldView(estimateYield(balanceCents, annualRateBps)),
  })),
  creditCards: balances.creditCards.map(({ creditLimitCents, totalCents, availableCents, debts, ...card }) => ({
    ...card,
    creditLimit: creditLimitCents === null ? null : fromCents(creditLimitCents),
    total: fromCents(totalCents),
    available: availableCents === null ? null : fromCents(availableCents),
    debts: debts.map((d) => ({
      currency: d.currency,
      amount: fromCents(d.amountCents),
      costBasis: d.costBasisCents === null ? null : fromCents(d.costBasisCents),
    })),
  })),
  inTransit: balances.inTransit.map((t) => ({ currency: t.currency, amount: fromCents(t.amountCents) })),
})

const toYieldView = (estimate: { monthlyCents: number; dailyCents: number } | null) =>
  estimate && { monthly: fromCents(estimate.monthlyCents), daily: fromCents(estimate.dailyCents) }
