import { toolDefinition } from '@tanstack/ai'
import type { McpContext } from '../mcp/mcp-context'
import { listCategories, listCategoriesInput } from './list-categories'

export const categoryTools = [
  toolDefinition({
    name: 'list_categories',
    description: 'List the categories available for transactions. Use their ids in create_transaction.',
    inputSchema: listCategoriesInput.omit({ includeSystem: true }),
    metadata: { annotations: { readOnlyHint: true } },
  }).server<McpContext>(async (input, ctx) => ({
    categories: await listCategories(ctx.context.db, ctx.context.userId, ctx.context.locale, input),
  })),
] as const
