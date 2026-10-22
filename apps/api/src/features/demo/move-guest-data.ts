import { eq } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import type { Db } from '../../db.ts'
import { bank, bankAccount, card, cashWallet, product } from '../accounts/account.schema.ts'
import { balanceAdjustment } from '../balance-adjustments/balance-adjustment.schema.ts'
import { user } from '../auth/auth.schema.ts'
import { budget } from '../budgets/budget.schema.ts'
import { category } from '../categories/category.schema.ts'
import { counterparty } from '../counterparties/counterparty.schema.ts'
import { document } from '../documents/document.schema.ts'
import { expectedIncome } from '../expected-incomes/expected-income.schema.ts'
import { pushSubscription } from '../push/push-subscription.schema.ts'
import { recurringExpense } from '../recurring-expenses/recurring-expense.schema.ts'
import { savingsContribution, savingsGoal } from '../savings-goals/savings-goal.schema.ts'
import { userCurrency, userSettings } from '../settings/settings.schema.ts'
import { transaction } from '../transactions/transaction.schema.ts'
import { transfer } from '../transfers/transfer.schema.ts'
import { webhook } from '../webhooks/webhook.schema.ts'

/**
 * Every table a guest owns. A table left out here loses its rows: the owner column cascades
 * when the anonymous plugin deletes the guest right after the move.
 */
export const guestOwnedTables = [
  userSettings,
  userCurrency,
  category,
  bank,
  bankAccount,
  product,
  cashWallet,
  card,
  counterparty,
  transaction,
  recurringExpense,
  balanceAdjustment,
  transfer,
  document,
  pushSubscription,
  savingsGoal,
  savingsContribution,
  expectedIncome,
  webhook,
  budget,
]

/**
 * Moves a guest's ledger to the account the guest becomes when it signs up.
 *
 * Only a guest that still exists moves: the plugin deletes it right after this runs, so a guest
 * that is gone already handed its ledger over, and moving again would be work for nothing.
 * The flag is not checked: a guest from before the flag existed must not lose its ledger.
 */
export async function moveGuestData(db: Db, fromUserId: string, toUserId: string) {
  const guest = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, fromUserId))
    .get()
  if (!guest) return

  const statements = guestOwnedTables.map((table) =>
    db.update(table).set({ userId: toUserId }).where(eq(table.userId, fromUserId)),
  )
  // Drizzle's batch wants a tuple, and the list of tables is built at runtime.
  await db.batch(statements as unknown as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]])
}
