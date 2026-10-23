import { toolDefinition } from '@tanstack/ai'
import { z } from 'zod'
import type { McpContext } from '../mcp/mcp-context'
import { getForecast } from './get-forecast'
import { getSafeToSpend } from './get-safe-to-spend'

export const spendingTools = [
  toolDefinition({
    name: 'safe_to_spend',
    description:
      "How much the user may spend today, in their primary currency: the money in hand, plus the income expected before the next payday and the months of a spread expense still to come, minus the bills still due, what the yearly bills and the savings goals should already hold, divided by the days until that payday (or the end of the month). The cap the user set for the month holds it down when it is lower.",
    inputSchema: z.object({}),
    metadata: { annotations: { readOnlyHint: true } },
  }).server<McpContext>(async (_input, ctx) => getSafeToSpend(ctx.context.db, ctx.context.userId)),

  toolDefinition({
    name: 'forecast',
    description:
      "The projected balance of each day until the end of the month, and the day it is lowest: what the user has now, plus the bills that fall due and the incomes the user expects.",
    inputSchema: z.object({}),
    metadata: { annotations: { readOnlyHint: true } },
  }).server<McpContext>(async (_input, ctx) => getForecast(ctx.context.db, ctx.context.userId)),
] as const
