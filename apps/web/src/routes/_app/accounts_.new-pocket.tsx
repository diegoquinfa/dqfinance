import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { NewPocketPage } from '#/features/accounts/new-pocket-page'

// The accounts page links here with the product the pocket will live in.
const newPocketSearch = z.object({
  productId: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_app/accounts_/new-pocket')({
  validateSearch: (search) => newPocketSearch.parse(search),
  component: NewPocketRoute,
})

function NewPocketRoute() {
  const { productId } = Route.useSearch()
  return <NewPocketPage productId={productId} />
}
