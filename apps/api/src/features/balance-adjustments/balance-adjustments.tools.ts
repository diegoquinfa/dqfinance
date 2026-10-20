import { toolDefinition } from '@tanstack/ai'
import { z } from 'zod'
import type { McpContext } from '../mcp/mcp-context'
import { sendPush } from '../push/send-push'
import { adjustBalance, adjustBalanceInput } from './adjust-balance'
import { listBalanceAdjustments } from './list-balance-adjustments'

export const balanceAdjustmentTools = [
  toolDefinition({
    name: 'list_balance_adjustments',
    description: 'The last 100 balance corrections, newest first: source, balance observed, difference recorded.',
    inputSchema: z.object({}),
    metadata: { annotations: { readOnlyHint: true } },
  }).server<McpContext>(async (_input, ctx) => ({
    adjustments: await listBalanceAdjustments(ctx.context.db, ctx.context.userId),
  })),

  toolDefinition({
    name: 'adjust_balance',
    description:
      "Set the real balance of a source when the app's balance does not match the bank. The difference is an adjustment, not income or expense. Confirm with the user first.",
    inputSchema: adjustBalanceInput,
  }).server<McpContext>(async (input, ctx) => {
    const adjusted = await adjustBalance(ctx.context.db, ctx.context.userId, input)
    // A zero delta records nothing, so there is nothing to announce.
    if (adjusted.delta !== 0) {
      await sendPush(ctx.context.db, ctx.context.userId, ctx.context.locale, ctx.context.push, 'balance_adjustment')
    }
    return adjusted
  }),
] as const
