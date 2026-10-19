import { toolDefinition } from '@tanstack/ai'
import type { McpContext } from '../mcp/mcp-context'
import { createCounterparty, createCounterpartyInput } from './create-counterparty'
import { deleteCounterparty, deleteCounterpartyInput } from './delete-counterparty'
import { listCounterparties, listCounterpartiesInput } from './list-counterparties'
import { updateCounterparty, updateCounterpartyToolInput } from './update-counterparty'

export const counterpartyTools = [
  toolDefinition({
    name: 'list_contacts',
    description:
      'List the people and businesses money went to or came from, with what was spent and received per currency. Use their ids as counterpartyId.',
    inputSchema: listCounterpartiesInput,
    metadata: { annotations: { readOnlyHint: true } },
  }).server<McpContext>(async (input, ctx) => ({
    contacts: await listCounterparties(ctx.context.db, ctx.context.userId, input),
  })),

  toolDefinition({
    name: 'create_contact',
    description: 'Add a person or business. Check list_contacts first to avoid duplicates.',
    inputSchema: createCounterpartyInput,
  }).server<McpContext>((input, ctx) => createCounterparty(ctx.context.db, ctx.context.userId, input)),

  toolDefinition({
    name: 'update_contact',
    description: 'Rename a contact or change its kind. Use the id from list_contacts.',
    inputSchema: updateCounterpartyToolInput,
  }).server<McpContext>((input, ctx) =>
    updateCounterparty(ctx.context.db, ctx.context.userId, input.id, { name: input.name, kind: input.kind }),
  ),

  toolDefinition({
    name: 'delete_contact',
    description: 'Delete a contact. Its movements stay in the history; they only lose the name.',
    inputSchema: deleteCounterpartyInput,
  }).server<McpContext>((input, ctx) => deleteCounterparty(ctx.context.db, ctx.context.userId, input.id)),
] as const
