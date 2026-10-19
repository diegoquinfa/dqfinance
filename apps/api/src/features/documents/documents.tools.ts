import { toolDefinition } from '@tanstack/ai'
import type { McpContext } from '../mcp/mcp-context'
import { listDocuments, listDocumentsInput } from './list-documents'

// Binary upload and download stay in the web app; agents only need to see what is attached.
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
] as const
