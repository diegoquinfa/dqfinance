import { createFileRoute } from '@tanstack/react-router'
import { AccountsPage } from '#/features/accounts/accounts-page'

export const Route = createFileRoute('/_app/accounts')({
  component: AccountsPage,
})
