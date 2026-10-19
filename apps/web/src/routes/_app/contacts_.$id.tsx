import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ContactPage } from '#/features/counterparties/contact-page'

// The list's filters come along, so going back keeps the list as it was.
const contactSearch = z.object({
  kind: z.enum(['all', 'person', 'business']).optional().catch('all'),
  search: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_app/contacts_/$id')({
  validateSearch: (search) => contactSearch.parse(search),
  component: ContactRoute,
})

function ContactRoute() {
  const { id } = Route.useParams()
  return <ContactPage id={id} />
}
