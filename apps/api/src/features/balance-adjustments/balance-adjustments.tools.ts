import { toolDefinition } from '@tanstack/ai'
import type { McpContext } from '../mcp/mcp-context'
import { adjustBalance, adjustBalanceInput } from './adjust-balance'

export const balanceAdjustmentTools = [
  toolDefinition({
    name: 'adjust_balance',
    description:
      "Set the real balance of a source when the app's balance does not match the bank. Records the difference as an adjustment; it is not income or expense. Confirm the amount with the user first.",
    inputSchema: adjustBalanceInput,
  }).server<McpContext>((input, ctx) => adjustBalance(ctx.context.db, ctx.context.userId, input)),
] as const
