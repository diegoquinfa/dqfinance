import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { NewCardPage } from '#/features/accounts/new-card-page'

// The accounts page links here with the product the user already picked.
const newCardSearch = z.object({
  productId: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_app/accounts_/new-card')({
  validateSearch: (search) => newCardSearch.parse(search),
  component: NewCardRoute,
})

function NewCardRoute() {
  const { productId } = Route.useSearch()
  return <NewCardPage productId={productId} />
}
