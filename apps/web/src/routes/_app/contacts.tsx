import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ContactsPage } from '#/features/counterparties/contacts-page'

// The filters live in the URL: a reload keeps them, and a link can preselect a kind.
const contactsSearch = z.object({
  kind: z.enum(['all', 'person', 'business']).optional().catch('all'),
  search: z.string().optional().catch(''),
  // The contacts being compared, comma separated, so the comparison survives a reload.
  compare: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_app/contacts')({
  validateSearch: (search) => contactsSearch.parse(search),
  component: ContactsPage,
})
