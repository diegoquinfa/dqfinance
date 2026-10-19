import { toolDefinition } from '@tanstack/ai'
import type { McpContext } from '../mcp/mcp-context'
import { sendPush } from '../push/send-push'
import { createTransfer, createTransferInput } from './create-transfer'
import { listTransfers, listTransfersInput } from './list-transfers'
import { markTransferReceived, markTransferReceivedInput } from './mark-transfer-received'

export const transferTools = [
  toolDefinition({
    name: 'create_transfer',
    description:
      "Move the user's own money between two of their sources (between accounts, cash withdrawal or deposit, credit card payment). Never use it for money sent to another person: that is an expense (create_transaction).",
    inputSchema: createTransferInput,
  }).server<McpContext>(async (input, ctx) => {
    const created = await createTransfer(ctx.context.db, ctx.context.userId, input)
    await sendPush(ctx.context.db, ctx.context.userId, ctx.context.locale, ctx.context.push, 'transfer')
    return created
  }),

  toolDefinition({
    name: 'list_transfers',
    description: "List the user's transfers, newest first. Each has a derived type (own_same_bank, withdrawal, card_payment, …).",
    inputSchema: listTransfersInput,
    metadata: { annotations: { readOnlyHint: true } },
  }).server<McpContext>(async (input, ctx) => ({
    transfers: await listTransfers(ctx.context.db, ctx.context.userId, input),
  })),

  toolDefinition({
    name: 'mark_transfer_received',
    description: 'Mark an in-transit transfer as arrived at its destination.',
    inputSchema: markTransferReceivedInput,
    metadata: { annotations: { idempotentHint: false } },
  }).server<McpContext>(async (input, ctx) => {
    const received = await markTransferReceived(ctx.context.db, ctx.context.userId, input)
    await sendPush(ctx.context.db, ctx.context.userId, ctx.context.locale, ctx.context.push, 'transfer_received')
    return received
  }),
] as const
