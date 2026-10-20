import { toolDefinition } from '@tanstack/ai'
import { z } from 'zod'
import { listAccounts } from '../accounts/list-accounts'
import type { McpContext } from '../mcp/mcp-context'
import { balanceHistoryInput, getBalanceHistory, toHistoryView } from './get-balance-history'
import { getBalances, toBalancesView } from './get-balances'

export const balanceTools = [
  toolDefinition({
    name: 'list_accounts',
    description:
      'List the money sources with their ids: products, cash wallets, debit cards, credit cards. Use { type, id } as the source in other tools.',
    inputSchema: z.object({}),
    metadata: { annotations: { readOnlyHint: true } },
  }).server<McpContext>(async (_input, ctx) => {
    const [tree, balances] = await Promise.all([
      listAccounts(ctx.context.db, ctx.context.userId),
      getBalances(ctx.context.db, ctx.context.userId).then(toBalancesView),
    ])
    const debitCards = tree.banks.flatMap((b) =>
      b.accounts.flatMap((a) =>
        a.products.flatMap((p) =>
          p.cards
            .filter((c) => c.kind === 'debit')
            .map((c) => ({ source: { type: 'card' as const, id: c.id }, name: c.name, currency: c.currency, spendsFrom: p.name })),
        ),
      ),
    )
    return {
      accounts: balances.accounts.map(({ ref, ...a }) => ({ source: ref, ...a })),
      debitCards,
      creditCards: balances.creditCards.map(({ ref, ...c }) => ({ source: ref, ...c })),
      inTransit: balances.inTransit,
    }
  }),

  toolDefinition({
    name: 'get_balance_history',
    description:
      'Month-end assets and card debt per currency over the last N months, ending with the current month. sourceType and sourceId follow one source (a card reports its debt).',
    inputSchema: balanceHistoryInput,
    metadata: { annotations: { readOnlyHint: true } },
  }).server<McpContext>(async (input, ctx) => ({
    points: toHistoryView(await getBalanceHistory(ctx.context.db, ctx.context.userId, input)),
  })),
] as const
