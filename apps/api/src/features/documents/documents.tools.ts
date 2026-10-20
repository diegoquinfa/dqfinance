import { toolDefinition } from '@tanstack/ai'
import { z } from 'zod'
import type { McpContext } from '../mcp/mcp-context'
import { deleteDocument } from './document-storage'
import { listDocuments, listDocumentsInput } from './list-documents'

// Binary upload and download stay in the web app; agents see what is attached and can remove it.
export const documentTools = [
  toolDefinition({
    name: 'list_documents',
    description:
      "List the files (contracts, terms, fee tables) attached to the user's sources, newest first. Uploading and downloading them happens in the web app.",
    inputSchema: listDocumentsInput,
    metadata: { annotations: { readOnlyHint: true } },
  }).server<McpContext>(async (input, ctx) => ({
    documents: await listDocuments(ctx.context.db, ctx.context.userId, input),
  })),

  toolDefinition({
    name: 'delete_document',
    description: 'Delete an attached file for good. Confirm with the user first.',
    inputSchema: z.object({ id: z.string().min(1) }),
  }).server<McpContext>((input, ctx) =>
    deleteDocument(ctx.context.documents, ctx.context.db, ctx.context.userId, input.id),
  ),
] as const
