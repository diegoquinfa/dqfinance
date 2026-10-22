import { createFileRoute } from '@tanstack/react-router'
import { SavingsGoalsPage } from '#/features/savings-goals/savings-goals-page'

export const Route = createFileRoute('/_app/savings')({
  component: SavingsGoalsPage,
})
