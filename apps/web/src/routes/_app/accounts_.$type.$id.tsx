import { createFileRoute, notFound } from '@tanstack/react-router'
import { SourcePage } from '#/features/balances/source-page'

const types = ['product', 'cash_wallet', 'card'] as const

export const Route = createFileRoute('/_app/accounts_/$type/$id')({
  params: {
    parse: ({ type, id }) => {
      if (!types.includes(type as (typeof types)[number])) throw notFound()
      return { type: type as (typeof types)[number], id }
    },
  },
  component: SourceRoute,
})

function SourceRoute() {
  const { type, id } = Route.useParams()
  return <SourcePage key={`${type}:${id}`} type={type} id={id} />
}
