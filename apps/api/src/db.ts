import { drizzle } from 'drizzle-orm/d1'
import * as accountSchema from './features/accounts/account.schema'
import * as authSchema from './features/auth/auth.schema'
import * as balanceAdjustmentSchema from './features/balance-adjustments/balance-adjustment.schema'
import * as categorySchema from './features/categories/category.schema'
import * as counterpartySchema from './features/counterparties/counterparty.schema'
import * as documentsSchema from './features/documents/document.schema'
import * as expectedIncomeSchema from './features/expected-incomes/expected-income.schema'
import * as pushSubscriptionSchema from './features/push/push-subscription.schema'
import * as recurringExpenseSchema from './features/recurring-expenses/recurring-expense.schema'
import * as savingsGoalSchema from './features/savings-goals/savings-goal.schema'
import * as settingsSchema from './features/settings/settings.schema'
import * as transactionSchema from './features/transactions/transaction.schema'
import * as transferSchema from './features/transfers/transfer.schema'

// Composition root for the database: every feature's *.schema.ts is registered here.
export const schema = {
  ...authSchema,
  ...settingsSchema,
  ...accountSchema,
  ...categorySchema,
  ...counterpartySchema,
  ...transactionSchema,
  ...transferSchema,
  ...balanceAdjustmentSchema,
  ...recurringExpenseSchema,
  ...pushSubscriptionSchema,
  ...documentsSchema,
  ...savingsGoalSchema,
  ...expectedIncomeSchema,
}

export const createDb = (d1: D1Database) => drizzle(d1, { schema })

export type Db = ReturnType<typeof createDb>
