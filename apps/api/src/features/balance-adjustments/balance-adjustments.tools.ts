import { toolDefinition } from '@tanstack/ai'
import type { McpContext } from '../mcp/mcp-context'
import { sendPush } from '../push/send-push'
import { adjustBalance, adjustBalanceInput } from './adjust-balance'

export const balanceAdjustmentTools = [
  toolDefinition({
    name: 'adjust_balance',
    description:
      "Set the real balance of a source when the app's balance does not match the bank. Records the difference as an adjustment; it is not income or expense. Confirm the amount with the user first.",
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
