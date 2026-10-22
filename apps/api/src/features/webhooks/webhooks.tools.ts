import { toolDefinition } from '@tanstack/ai'
import { z } from 'zod'
import type { McpContext } from '../mcp/mcp-context'
import { createWebhook, createWebhookInput, deleteWebhook, listWebhooks } from './webhooks'

export const webhookTools = [
  toolDefinition({
    name: 'list_webhooks',
    description:
      "List the webhooks the user set up: the URL the app calls when a bill falls due. The secret is never shown.",
    inputSchema: z.object({}),
    metadata: { annotations: { readOnlyHint: true } },
  }).server<McpContext>(async (_input, ctx) => ({ webhooks: await listWebhooks(ctx.context.db, ctx.context.userId) })),

  toolDefinition({
    name: 'create_webhook',
    description:
      'Set up a webhook: the public https URL the app calls when a bill falls due, and the secret the signature is made with. The URL must be a public https address.',
    inputSchema: createWebhookInput,
  }).server<McpContext>((input, ctx) => createWebhook(ctx.context.db, ctx.context.userId, input)),

  toolDefinition({
    name: 'delete_webhook',
    description: 'Remove a webhook.',
    inputSchema: z.object({ id: z.string().min(1) }),
  }).server<McpContext>((input, ctx) => deleteWebhook(ctx.context.db, ctx.context.userId, input.id)),
] as const
