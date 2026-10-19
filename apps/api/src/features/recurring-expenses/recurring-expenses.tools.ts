import { toolDefinition } from '@tanstack/ai'
import { z } from 'zod'
import type { McpContext } from '../mcp/mcp-context'
import {
  confirmRecurringExpense,
  confirmRecurringExpenseInput,
  skipRecurringExpense,
  skipRecurringExpenseInput,
} from './confirm-recurring-expense'
import { listRecurringExpenses } from './list-recurring-expenses'

export const recurringExpenseTools = [
  toolDefinition({
    name: 'list_pending_recurring',
    description: "Recurring expenses that are due (the user's 'to confirm' inbox). Ask the user before confirming each one.",
    inputSchema: z.object({}),
    metadata: { annotations: { readOnlyHint: true } },
  }).server<McpContext>(async (_input, ctx) => ({
    pending: await listRecurringExpenses(ctx.context.db, ctx.context.userId, ctx.context.locale, { pending: true }),
  })),

  toolDefinition({
    name: 'confirm_recurring',
    description: 'Record a due recurring expense as a real expense (optionally with the real amount) and move it to its next due date.',
    inputSchema: confirmRecurringExpenseInput,
  }).server<McpContext>((input, ctx) => confirmRecurringExpense(ctx.context.db, ctx.context.userId, input)),

  toolDefinition({
    name: 'skip_recurring',
    description: 'Skip this occurrence of a recurring expense without recording anything (e.g. it was not charged).',
    inputSchema: skipRecurringExpenseInput,
  }).server<McpContext>((input, ctx) => skipRecurringExpense(ctx.context.db, ctx.context.userId, input)),
] as const
