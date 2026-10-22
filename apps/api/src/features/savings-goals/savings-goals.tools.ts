import { toolDefinition } from '@tanstack/ai'
import { z } from 'zod'
import type { McpContext } from '../mcp/mcp-context'
import { addContribution, addContributionInput } from './add-contribution'
import { createGoal, createGoalInput } from './create-goal'
import { deleteGoal } from './delete-goal'
import { listGoals } from './list-goals'

export const savingsGoalTools = [
  toolDefinition({
    name: 'list_savings_goals',
    description:
      "List the user's savings goals with what each one holds and what it asks for every month.",
    inputSchema: z.object({}),
    metadata: { annotations: { readOnlyHint: true } },
  }).server<McpContext>(async (_input, ctx) => ({ goals: await listGoals(ctx.context.db, ctx.context.userId) })),

  toolDefinition({
    name: 'create_savings_goal',
    description:
      'Create a savings goal: what it is for, how much it aims at, and when the user wants it reached. The currency defaults to the primary one.',
    inputSchema: createGoalInput,
  }).server<McpContext>((input, ctx) => createGoal(ctx.context.db, ctx.context.userId, input)),

  toolDefinition({
    name: 'add_savings_contribution',
    description: 'Record what the user put into a savings goal.',
    inputSchema: addContributionInput,
  }).server<McpContext>((input, ctx) => addContribution(ctx.context.db, ctx.context.userId, input)),

  toolDefinition({
    name: 'delete_savings_goal',
    description: 'Delete a savings goal and what was put into it.',
    inputSchema: z.object({ id: z.string().min(1) }),
  }).server<McpContext>((input, ctx) => deleteGoal(ctx.context.db, ctx.context.userId, input.id)),
] as const
