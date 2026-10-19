import { toolDefinition } from '@tanstack/ai'
import type { McpContext } from '../mcp/mcp-context'
import { createCounterparty, createCounterpartyInput } from './create-counterparty'
import { listCounterparties, listCounterpartiesInput } from './list-counterparties'

export const counterpartyTools = [
  toolDefinition({
    name: 'list_contacts',
    description: 'List the people and businesses money went to or came from. Use their ids as counterpartyId.',
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
] as const
