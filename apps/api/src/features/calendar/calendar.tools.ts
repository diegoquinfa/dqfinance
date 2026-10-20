import { toolDefinition } from '@tanstack/ai'
import type { McpContext } from '../mcp/mcp-context'
import { getCalendar, getCalendarInput } from './get-calendar'

export const calendarTools = [
  toolDefinition({
    name: 'get_calendar',
    description:
      "Day by day in the user's timezone, for up to 62 days: what was spent and received per currency, and which recurring expenses fall due. Transfers and balance adjustments are not counted.",
    inputSchema: getCalendarInput,
    metadata: { annotations: { readOnlyHint: true } },
  }).server<McpContext>((input, ctx) => getCalendar(ctx.context.db, ctx.context.userId, ctx.context.locale, input)),
] as const
