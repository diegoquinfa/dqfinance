import { createFileRoute } from '@tanstack/react-router'
import { TransfersPage } from '#/features/transfers/transfers-page'

export const Route = createFileRoute('/_app/transfers')({
  component: TransfersPage,
})
