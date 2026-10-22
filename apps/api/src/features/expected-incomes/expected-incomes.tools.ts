import { toolDefinition } from '@tanstack/ai'
import { z } from 'zod'
import type { McpContext } from '../mcp/mcp-context'
import { createExpectedIncome, createExpectedIncomeInput } from './create-expected-income'
import { deleteExpectedIncome } from './delete-expected-income'
import { listExpectedIncomes } from './list-expected-incomes'

export const expectedIncomeTools = [
  toolDefinition({
    name: 'list_expected_incomes',
    description:
      "List the incomes the user expects, with the day each one next arrives. They are what safe-to-spend counts on.",
    inputSchema: z.object({}),
    metadata: { annotations: { readOnlyHint: true } },
  }).server<McpContext>(async (_input, ctx) => ({
    incomes: await listExpectedIncomes(ctx.context.db, ctx.context.userId),
  })),

  toolDefinition({
    name: 'create_expected_income',
    description:
      'Add an income the user expects: what it is, how much it brings and how often it arrives. The currency defaults to the primary one.',
    inputSchema: createExpectedIncomeInput,
  }).server<McpContext>((input, ctx) => createExpectedIncome(ctx.context.db, ctx.context.userId, input)),

  toolDefinition({
    name: 'delete_expected_income',
    description: 'Delete an expected income. The movements it produced stay.',
    inputSchema: z.object({ id: z.string().min(1) }),
  }).server<McpContext>((input, ctx) => deleteExpectedIncome(ctx.context.db, ctx.context.userId, input.id)),
] as const
