import { createFileRoute } from '@tanstack/react-router'
import { OverviewPage } from '#/features/balances/overview-page'

export const Route = createFileRoute('/_app/overview')({
  component: OverviewPage,
})
