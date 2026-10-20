import { eq } from 'drizzle-orm'
import type { Db } from '../../db'
import { bank, bankAccount, card, cashWallet, product } from '../accounts/account.schema'
import { balanceAdjustment } from '../balance-adjustments/balance-adjustment.schema'
import { category } from '../categories/category.schema'
import { counterparty } from '../counterparties/counterparty.schema'
import { document } from '../documents/document.schema'
import { pushSubscription } from '../push/push-subscription.schema'
import { recurringExpense } from '../recurring-expenses/recurring-expense.schema'
import { userCurrency, userSettings } from '../settings/settings.schema'
import { transaction } from '../transactions/transaction.schema'
import { transfer } from '../transfers/transfer.schema'

/**
 * Moves a guest's ledger to the account the guest becomes when it signs up.
 *
 * Every table that carries a `user_id` is listed here, one statement each: a table left out
 * would keep rows nobody owns. The anonymous plugin deletes the guest right after this runs.
 */
export async function moveGuestData(db: Db, fromUserId: string, toUserId: string) {
  await db.batch([
    db.update(userSettings).set({ userId: toUserId }).where(eq(userSettings.userId, fromUserId)),
    db.update(userCurrency).set({ userId: toUserId }).where(eq(userCurrency.userId, fromUserId)),
    db.update(category).set({ userId: toUserId }).where(eq(category.userId, fromUserId)),
    db.update(bank).set({ userId: toUserId }).where(eq(bank.userId, fromUserId)),
    db.update(bankAccount).set({ userId: toUserId }).where(eq(bankAccount.userId, fromUserId)),
    db.update(product).set({ userId: toUserId }).where(eq(product.userId, fromUserId)),
    db.update(cashWallet).set({ userId: toUserId }).where(eq(cashWallet.userId, fromUserId)),
    db.update(card).set({ userId: toUserId }).where(eq(card.userId, fromUserId)),
    db.update(counterparty).set({ userId: toUserId }).where(eq(counterparty.userId, fromUserId)),
    db.update(transaction).set({ userId: toUserId }).where(eq(transaction.userId, fromUserId)),
    db.update(recurringExpense).set({ userId: toUserId }).where(eq(recurringExpense.userId, fromUserId)),
    db.update(balanceAdjustment).set({ userId: toUserId }).where(eq(balanceAdjustment.userId, fromUserId)),
    db.update(transfer).set({ userId: toUserId }).where(eq(transfer.userId, fromUserId)),
    db.update(document).set({ userId: toUserId }).where(eq(document.userId, fromUserId)),
    db.update(pushSubscription).set({ userId: toUserId }).where(eq(pushSubscription.userId, fromUserId)),
  ])
}
