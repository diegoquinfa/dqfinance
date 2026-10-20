import { toolDefinition } from '@tanstack/ai'
import { z } from 'zod'
import type { McpContext } from '../mcp/mcp-context'
import { getSettings } from './get-settings'

// Read-only: language, currencies and timezone are changed in the web app.
export const settingTools = [
  toolDefinition({
    name: 'get_settings',
    description:
      'Country, language, timezone, primary currency and enabled currencies (for accounts and movements); null before onboarding.',
    inputSchema: z.object({}),
    metadata: { annotations: { readOnlyHint: true } },
  }).server<McpContext>(async (_input, ctx) => ({ settings: await getSettings(ctx.context.db, ctx.context.userId) })),
] as const
