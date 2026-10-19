import { createFileRoute } from '@tanstack/react-router'
import { ImportPage } from '#/features/transactions/import-page'

export const Route = createFileRoute('/_app/transactions_/import')({
  component: ImportPage,
})
