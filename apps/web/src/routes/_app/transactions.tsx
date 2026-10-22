import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { TransactionsPage } from '#/features/transactions/transactions-page'

// The filters live in the URL: a reload keeps them, and a link can preselect a source.
const transactionsSearch = z.object({
  type: z.enum(['all', 'expense', 'income']).optional().catch('all'),
  source: z.string().optional().catch(''),
  from: z.string().optional().catch(''),
  to: z.string().optional().catch(''),
  // The words to look for in the title, the description and the category.
  q: z.string().optional().catch(''),
  // A contact's page links here to see the movements it does not show.
  counterpartyId: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_app/transactions')({
  validateSearch: (search) => transactionsSearch.parse(search),
  component: TransactionsPage,
})
