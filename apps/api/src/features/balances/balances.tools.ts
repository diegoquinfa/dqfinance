import { toolDefinition } from '@tanstack/ai'
import { z } from 'zod'
import { listAccounts } from '../accounts/list-accounts'
import type { McpContext } from '../mcp/mcp-context'
import { getBalances, toBalancesView } from './get-balances'

export const balanceTools = [
  toolDefinition({
    name: 'list_accounts',
    description:
      "List every source of the user's money with its id: bank products and cash wallets (with balance), debit cards (spend from their product), and credit cards (debt per currency). Use { type, id } as the source in other tools.",
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
] as const
