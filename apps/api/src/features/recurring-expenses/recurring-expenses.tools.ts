import { toolDefinition } from '@tanstack/ai'
import { z } from 'zod'
import type { McpContext } from '../mcp/mcp-context'
import { sendPush } from '../push/send-push'
import {
  confirmRecurringExpense,
  confirmRecurringExpenseInput,
  deleteRecurringExpense,
  skipRecurringExpense,
  skipRecurringExpenseInput,
} from './confirm-recurring-expense'
import { createRecurringExpense, createRecurringExpenseInput } from './create-recurring-expense'
import { listRecurringExpenses, listRecurringExpensesInput } from './list-recurring-expenses'

export const recurringExpenseTools = [
  toolDefinition({
    name: 'list_recurring',
    description:
      "The user's recurring expenses (subscriptions, bills). pending: true returns only the due ones, the 'to confirm' inbox; ask the user before confirming each one.",
    inputSchema: listRecurringExpensesInput,
    metadata: { annotations: { readOnlyHint: true } },
  }).server<McpContext>(async (input, ctx) => ({
    recurring: await listRecurringExpenses(ctx.context.db, ctx.context.userId, ctx.context.locale, input),
  })),

  toolDefinition({
    name: 'create_recurring',
    description:
      'Track a subscription or bill that repeats. It records nothing now: each due date appears in the inbox to confirm or skip.',
    inputSchema: createRecurringExpenseInput,
  }).server<McpContext>((input, ctx) => createRecurringExpense(ctx.context.db, ctx.context.userId, input)),

  toolDefinition({
    name: 'delete_recurring',
    description: 'Stop tracking a recurring expense. Expenses already confirmed from it stay in the history.',
    inputSchema: z.object({ id: z.string().min(1) }),
  }).server<McpContext>((input, ctx) => deleteRecurringExpense(ctx.context.db, ctx.context.userId, input.id)),

  toolDefinition({
    name: 'confirm_recurring',
    description: 'Record a due recurring expense as a real expense (optionally with the real amount) and move it to its next due date.',
    inputSchema: confirmRecurringExpenseInput,
  }).server<McpContext>(async (input, ctx) => {
    const confirmed = await confirmRecurringExpense(ctx.context.db, ctx.context.userId, input)
    await sendPush(ctx.context.db, ctx.context.userId, ctx.context.locale, ctx.context.push)
    return confirmed
  }),

  toolDefinition({
    name: 'skip_recurring',
    description: 'Skip this occurrence of a recurring expense without recording anything (e.g. it was not charged).',
    inputSchema: skipRecurringExpenseInput,
  }).server<McpContext>((input, ctx) => skipRecurringExpense(ctx.context.db, ctx.context.userId, input)),
] as const
