import { toolDefinition } from '@tanstack/ai'
import type { McpContext } from '../mcp/mcp-context'
import { recordCardStatement, recordCardStatementInput } from './record-card-statement'

export const cardStatementTools = [
  toolDefinition({
    name: 'record_card_statement',
    description:
      "Record what a credit card's statement asks the user to pay after a cut; recording the same cut again replaces it.",
    inputSchema: recordCardStatementInput,
  }).server<McpContext>((input, ctx) => recordCardStatement(ctx.context.db, ctx.context.userId, input)),
] as const
