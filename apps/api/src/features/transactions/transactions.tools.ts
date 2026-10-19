import { toolDefinition } from '@tanstack/ai'
import type { McpContext } from '../mcp/mcp-context'
import { sendPush } from '../push/send-push'
import { createTransaction, createTransactionInput } from './create-transaction'
import { importTransactions, importTransactionsInput } from './import-transactions'
import { listTransactions, listTransactionsInput } from './list-transactions'
import { summarizeTransactions, summarizeTransactionsInput } from './summarize-transactions'

// ctx.context.userId comes from the verified OAuth token (sub claim), never from tool input.
export const transactionTools = [
  toolDefinition({
    name: 'create_transaction',
    description:
      'Record an income or expense on one of the user\'s sources. Not for moving money between the user\'s own accounts: use create_transfer for that.',
    inputSchema: createTransactionInput,
  }).server<McpContext>(async (input, ctx) => {
    const created = await createTransaction(ctx.context.db, ctx.context.userId, input)
    await sendPush(ctx.context.db, ctx.context.userId, ctx.context.locale, ctx.context.push, created.type)
    return created
  }),

  toolDefinition({
    name: 'import_transactions',
    description:
      "Record many movements of one source from a bank statement or card statement. Parse the PDF, screenshot or video yourself and send one row per movement with its type, amount, date (YYYY-MM-DD) and description; leave categoryId out when you cannot tell the category. Rows that look like a movement already recorded there (same source, type, amount, calendar day and description) are skipped. Call it with dryRun true first, show the user the preview of what would be created and skipped, and call it again with dryRun false only after they agree.",
    inputSchema: importTransactionsInput,
  }).server<McpContext>(async (input, ctx) => {
    const imported = await importTransactions(ctx.context.db, ctx.context.userId, ctx.context.locale, input)
    if (imported.created > 0) {
      await sendPush(ctx.context.db, ctx.context.userId, ctx.context.locale, ctx.context.push, 'import')
    }
    return imported
  }),

  toolDefinition({
    name: 'list_transactions',
    description: "List the user's income and expenses, newest first, with optional filters.",
    inputSchema: listTransactionsInput,
    metadata: { annotations: { readOnlyHint: true } },
  }).server<McpContext>(async (input, ctx) => ({
    transactions: await listTransactions(ctx.context.db, ctx.context.userId, ctx.context.locale, input),
  })),

  toolDefinition({
    name: 'summarize_transactions',
    description:
      'Total income and expense per currency for the same filters as list_transactions, summed in the database. Use it to total a period instead of paging through list_transactions.',
    inputSchema: summarizeTransactionsInput,
    metadata: { annotations: { readOnlyHint: true } },
  }).server<McpContext>(async (input, ctx) => ({
    summary: await summarizeTransactions(ctx.context.db, ctx.context.userId, input),
  })),
] as const
