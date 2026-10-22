import { toolDefinition } from '@tanstack/ai'
import { z } from 'zod'
import type { McpContext } from '../mcp/mcp-context'
import { getSafeToSpend } from './get-safe-to-spend'

export const spendingTools = [
  toolDefinition({
    name: 'safe_to_spend',
    description:
      "How much the user may spend today, in their primary currency: the money in hand minus the fixed bills still due, divided by the days left in the month. The cap the user set for the month holds it down when it is lower.",
    inputSchema: z.object({}),
    metadata: { annotations: { readOnlyHint: true } },
  }).server<McpContext>(async (_input, ctx) => getSafeToSpend(ctx.context.db, ctx.context.userId)),
] as const
