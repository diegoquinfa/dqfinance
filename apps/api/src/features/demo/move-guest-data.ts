import { and, eq, inArray, isNotNull } from 'drizzle-orm'
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
 * Moves a guest's ledger to the account the guest becomes when it signs up or signs in.
 *
 * Only a guest that still exists moves: the plugin deletes it right after this runs, so a guest
 * that is gone already handed its ledger over, and moving again would be work for nothing.
 * The flag is not checked: a guest from before the flag existed must not lose its ledger.
 *
 * Signing into an existing account moves the guest too, and that account may already own a row
 * whose unique key the guest also holds: `user_settings` (one row per user), `user_currency`
 * (`user_id, code`), the system categories (`user_id, system_key`) and the push subscription
 * endpoint (globally unique, so a browser that used the demo and then signed in keeps one row).
 * A plain UPDATE collides on those keys, the hook rejects, and the guest is left behind, so the
 * conflict rule is: the target's row wins, the guest's duplicate is dropped, and every other row
 * still moves. Ledger rows that point at a dropped system category are re-pointed to the target's
 * category of the same key first, so deleting the guest's copy never hits the `restrict` foreign
 * keys.
 */
export async function moveGuestData(db: Db, fromUserId: string, toUserId: string) {
  const guest = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, fromUserId))
    .get()
  if (!guest) return

  const currencies = await db
    .select({ userId: userCurrency.userId, code: userCurrency.code })
    .from(userCurrency)
    .where(inArray(userCurrency.userId, [fromUserId, toUserId]))
  const targetCurrencies = new Set(
    currencies.filter((row) => row.userId === toUserId).map((row) => row.code),
  )
  const sharedCodes = currencies
    .filter((row) => row.userId === fromUserId && targetCurrencies.has(row.code))
    .map((row) => row.code)

  const categories = await db
    .select({ id: category.id, userId: category.userId, systemKey: category.systemKey })
    .from(category)
    .where(and(inArray(category.userId, [fromUserId, toUserId]), isNotNull(category.systemKey)))
  const targetCategory = new Map(
    categories
      .filter((row) => row.userId === toUserId && row.systemKey !== null)
      .map((row) => [row.systemKey!, row.id] as const),
  )
  const duplicates = categories.flatMap((row) => {
    if (row.userId !== fromUserId || row.systemKey === null) return []
    const targetId = targetCategory.get(row.systemKey)
    return targetId ? [{ guestId: row.id, targetId }] : []
  })

  // A budget on a dropped category goes with it unless the target has no budget for its copy.
  const targetBudgets = new Set(
    duplicates.length
      ? (
          await db
            .select({ categoryId: budget.categoryId })
            .from(budget)
            .where(
              and(
                eq(budget.userId, toUserId),
                inArray(budget.categoryId, duplicates.map(({ targetId }) => targetId)),
              ),
            )
        ).map((row) => row.categoryId)
      : [],
  )
  const endpoints = await db
    .select({ userId: pushSubscription.userId, endpoint: pushSubscription.endpoint })
    .from(pushSubscription)
    .where(inArray(pushSubscription.userId, [fromUserId, toUserId]))
  const targetEndpoints = new Set(
    endpoints.filter((row) => row.userId === toUserId).map((row) => row.endpoint),
  )
  const sharedEndpoints = endpoints
    .filter((row) => row.userId === fromUserId && targetEndpoints.has(row.endpoint))
    .map((row) => row.endpoint)

  const settings = await db
    .select({ userId: userSettings.userId })
    .from(userSettings)
    .where(eq(userSettings.userId, toUserId))
    .get()

  const statements: BatchItem<'sqlite'>[] = []

  // The target's row wins where a unique key would reject the guest's.
  if (settings) statements.push(db.delete(userSettings).where(eq(userSettings.userId, fromUserId)))
  if (sharedCodes.length) {
    statements.push(
      db
        .delete(userCurrency)
        .where(and(eq(userCurrency.userId, fromUserId), inArray(userCurrency.code, sharedCodes))),
    )
  }
  if (sharedEndpoints.length) {
    statements.push(
      db
        .delete(pushSubscription)
        .where(
          and(
            eq(pushSubscription.userId, fromUserId),
            inArray(pushSubscription.endpoint, sharedEndpoints),
          ),
        ),
    )
  }
  for (const { guestId, targetId } of duplicates) {
    const onGuest = (table: typeof transaction | typeof recurringExpense | typeof budget) =>
      and(eq(table.userId, fromUserId), eq(table.categoryId, guestId))
    statements.push(
      db.update(transaction).set({ categoryId: targetId }).where(onGuest(transaction)),
      db.update(recurringExpense).set({ categoryId: targetId }).where(onGuest(recurringExpense)),
    )
    if (!targetBudgets.has(targetId)) {
      statements.push(db.update(budget).set({ categoryId: targetId }).where(onGuest(budget)))
    }
    statements.push(
      db.delete(category).where(and(eq(category.userId, fromUserId), eq(category.id, guestId))),
    )
  }

  statements.push(
    ...guestOwnedTables.map((table) =>
      db.update(table).set({ userId: toUserId }).where(eq(table.userId, fromUserId)),
    ),
  )
  // Drizzle's batch wants a tuple, and the list of tables is built at runtime.
  await db.batch(statements as unknown as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]])
}
