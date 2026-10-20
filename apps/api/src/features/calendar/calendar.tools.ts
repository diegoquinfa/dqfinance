import { toolDefinition } from '@tanstack/ai'
import type { McpContext } from '../mcp/mcp-context'
import { getCalendar, getCalendarInput } from './get-calendar'

export const calendarTools = [
  toolDefinition({
    name: 'get_calendar',
    description:
      "Day by day in the user's timezone, up to 62 days: amounts spent and received per currency, and recurring expenses falling due. Transfers and adjustments are not counted.",
    inputSchema: getCalendarInput,
    metadata: { annotations: { readOnlyHint: true } },
  }).server<McpContext>((input, ctx) => getCalendar(ctx.context.db, ctx.context.userId, ctx.context.locale, input)),
] as const
