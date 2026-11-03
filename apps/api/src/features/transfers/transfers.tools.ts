import { toolDefinition } from '@tanstack/ai'
import type { McpContext } from '../mcp/mcp-context'
import { sendPush } from '../push/send-push'
import { createTransfer, createTransferInput } from './create-transfer'
import { deleteTransfer, deleteTransferInput } from './delete-transfer'
import { listTransfers, listTransfersInput } from './list-transfers'
import { markTransferReceived, markTransferReceivedInput } from './mark-transfer-received'
import { updateTransfer, updateTransferToolInput } from './update-transfer'

export const transferTools = [
  toolDefinition({
    name: 'create_transfer',
    description:
      "Move money between two of their own sources: between accounts, a cash withdrawal or deposit, or a credit card payment. Never for money sent to another person: that is an expense (create_transaction).",
    inputSchema: createTransferInput,
  }).server<McpContext>(async (input, ctx) => {
    const created = await createTransfer(ctx.context.db, ctx.context.userId, input)
    await sendPush(ctx.context.db, ctx.context.userId, ctx.context.locale, ctx.context.push, 'transfer')
    return created
  }),

  toolDefinition({
    name: 'list_transfers',
    description: "List transfers, newest first. Each has a derived type (own_same_bank, withdrawal, card_payment, …).",
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

  toolDefinition({
    name: 'update_transfer',
    description:
      "Change a transfer: send only the fields to change; null removes the note or the fee. The fee and the FX difference follow the new amount, and both balances are read as if the old transfer had never been recorded. A change of origin or destination moves the money between the new sources.",
    inputSchema: updateTransferToolInput,
  }).server<McpContext>(async ({ id, ...input }, ctx) => updateTransfer(ctx.context.db, ctx.context.userId, id, input)),

  toolDefinition({
    name: 'delete_transfer',
    description:
      'Delete a transfer recorded by mistake. Both balances go back as if it had never been recorded. Confirm with the user first.',
    inputSchema: deleteTransferInput,
    metadata: { annotations: { destructiveHint: true } },
  }).server<McpContext>((input, ctx) => deleteTransfer(ctx.context.db, ctx.context.userId, input.id)),
] as const
