import { createFileRoute } from '@tanstack/react-router'
import { RecurringPage } from '#/features/recurring-expenses/recurring-page'

export const Route = createFileRoute('/_app/recurring')({
  component: RecurringPage,
})
