import { createFileRoute } from '@tanstack/react-router'
import { ContactsPage } from '#/features/counterparties/contacts-page'

export const Route = createFileRoute('/_app/contacts')({
  component: ContactsPage,
})
