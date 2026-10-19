import { toolDefinition } from '@tanstack/ai'
import type { McpContext } from '../mcp/mcp-context'
import { sendExpensePush } from '../push/send-expense-push'
import { createTransaction, createTransactionInput } from './create-transaction'
import { listTransactions, listTransactionsInput } from './list-transactions'

// ctx.context.userId comes from the verified OAuth token (sub claim), never from tool input.
export const transactionTools = [
  toolDefinition({
    name: 'create_transaction',
    description:
      'Record an income or expense on one of the user\'s sources. Not for moving money between the user\'s own accounts: use create_transfer for that.',
    inputSchema: createTransactionInput,
  }).server<McpContext>(async (input, ctx) => {
    const created = await createTransaction(ctx.context.db, ctx.context.userId, input)
    if (created.type === 'expense') {
      await sendExpensePush(ctx.context.db, ctx.context.userId, ctx.context.locale, ctx.context.push)
    }
    return created
  }),

  toolDefinition({
    name: 'list_transactions',
    description: "List the user's income and expenses, newest first, with optional filters.",
    inputSchema: listTransactionsInput,
    metadata: { annotations: { readOnlyHint: true } },
  }).server<McpContext>(async (input, ctx) => ({
    transactions: await listTransactions(ctx.context.db, ctx.context.userId, ctx.context.locale, input),
  })),
] as const
