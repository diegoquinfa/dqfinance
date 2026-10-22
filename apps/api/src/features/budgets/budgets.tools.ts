import { toolDefinition } from '@tanstack/ai'
import { z } from 'zod'
import type { McpContext } from '../mcp/mcp-context'
import { deleteBudget } from './delete-budget'
import { listBudgets } from './list-budgets'
import { setBudget, setBudgetInput } from './set-budget'

export const budgetTools = [
  toolDefinition({
    name: 'list_budgets',
    description:
      "List the user's category budgets with what each one has spent this month and what is left of the limit.",
    inputSchema: z.object({}),
    metadata: { annotations: { readOnlyHint: true } },
  }).server<McpContext>(async (_input, ctx) => ({ budgets: await listBudgets(ctx.context.db, ctx.context.userId) })),

  toolDefinition({
    name: 'set_budget',
    description:
      'Set the limit of a category: what it may spend in a month. One limit per category; a new amount replaces the old one.',
    inputSchema: setBudgetInput,
  }).server<McpContext>((input, ctx) => setBudget(ctx.context.db, ctx.context.userId, input)),

  toolDefinition({
    name: 'delete_budget',
    description: 'Remove the limit of a category. The movements it counted stay.',
    inputSchema: z.object({ id: z.string().min(1) }),
  }).server<McpContext>((input, ctx) => deleteBudget(ctx.context.db, ctx.context.userId, input.id)),
] as const
