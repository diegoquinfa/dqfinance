import { toolDefinition } from '@tanstack/ai'
import type { McpContext } from '../mcp/mcp-context'
import { createCategory, createCategoryInput } from './create-category'
import { listCategories, listCategoriesInput } from './list-categories'

export const categoryTools = [
  toolDefinition({
    name: 'list_categories',
    description:
      'List the categories for transactions and their ids (used in create_transaction). includeSystem adds the ones booked automatically (FX difference, bank fees).',
    inputSchema: listCategoriesInput,
    metadata: { annotations: { readOnlyHint: true } },
  }).server<McpContext>(async (input, ctx) => ({
    categories: await listCategories(ctx.context.db, ctx.context.userId, ctx.context.locale, input),
  })),

  toolDefinition({
    name: 'create_category',
    description: 'Add an income or expense category. Check list_categories first to avoid duplicates.',
    inputSchema: createCategoryInput,
  }).server<McpContext>((input, ctx) => createCategory(ctx.context.db, ctx.context.userId, input)),
] as const
