import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { NewAccountPage } from '#/features/accounts/new-account-page'

// The accounts page links here with the bank or the bank account the user already picked.
const newAccountSearch = z.object({
  bankId: z.string().optional().catch(undefined),
  bankAccountId: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_app/accounts_/new')({
  validateSearch: (search) => newAccountSearch.parse(search),
  component: NewAccountRoute,
})

function NewAccountRoute() {
  const { bankId, bankAccountId } = Route.useSearch()
  return <NewAccountPage bankId={bankId} bankAccountId={bankAccountId} />
}
