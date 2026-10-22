import { toolDefinition } from '@tanstack/ai'
import type { McpContext } from '../mcp/mcp-context'
import { createCategory, createCategoryInput } from './create-category'
import { deleteCategory, deleteCategoryInput } from './delete-category'
import { listCategories, listCategoriesInput } from './list-categories'
import { mergeCategories, mergeCategoriesInput } from './merge-categories'
import { updateCategory, updateCategoryToolInput } from './update-category'

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
    description:
      'Add an income or expense category. Check list_categories first to avoid duplicates. icon and color are optional marks.',
    inputSchema: createCategoryInput,
  }).server<McpContext>((input, ctx) => createCategory(ctx.context.db, ctx.context.userId, input)),

  toolDefinition({
    name: 'update_category',
    description:
      'Rename a category and set its mark. null clears the icon or the color. The kind of a category never changes.',
    inputSchema: updateCategoryToolInput,
  }).server<McpContext>(({ id, ...input }, ctx) =>
    updateCategory(ctx.context.db, ctx.context.userId, id, input),
  ),

  toolDefinition({
    name: 'delete_category',
    description:
      'Delete a category that has no movements. A category with movements cannot be deleted: merge it into another one instead.',
    inputSchema: deleteCategoryInput,
  }).server<McpContext>((input, ctx) => deleteCategory(ctx.context.db, ctx.context.userId, input.id)),

  toolDefinition({
    name: 'merge_categories',
    description:
      'Merge a category into another one of the same kind: its movements move over and it disappears. Use it to rename a category that is already in use.',
    inputSchema: mergeCategoriesInput,
  }).server<McpContext>((input, ctx) => mergeCategories(ctx.context.db, ctx.context.userId, input)),
] as const
