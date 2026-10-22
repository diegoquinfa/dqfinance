import { createFileRoute } from '@tanstack/react-router'
import { ExpectedIncomesPage } from '#/features/expected-incomes/expected-incomes-page'

export const Route = createFileRoute('/_app/incomes')({
  component: ExpectedIncomesPage,
})
