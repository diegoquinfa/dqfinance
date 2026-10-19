import { Link, useSearch } from '@tanstack/react-router'
import { NewTransactionDialog } from '#/features/transactions/new-transaction-dialog'
import { TransactionRow } from '#/features/transactions/transaction-row'
import { useTransactions } from '#/features/transactions/transactions-api'
import { useSettings } from '#/features/settings/settings-api'
import { m } from '#/shared/i18n'
import { Badge } from '#/shared/ui/badge'
import { Button } from '#/shared/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '#/shared/ui/empty'
import { ListSkeleton } from '#/shared/ui/list-skeleton'
import { Section, rowsClass } from '#/shared/ui/page'
import { useCounterparties } from './counterparties-api'
import { ContactTotals, kindTag } from './contact-row'

/** One contact: its name, its kind and the money that moved, then the movements behind it. */
export function ContactPage({ id }: { id: string }) {
  // The list's filters travel here, so the back link returns to the list as it was.
  const listSearch = useSearch({ from: '/_app/contacts_/$id' })
  const contacts = useCounterparties()
  const { data: settings } = useSettings()
  const movements = useTransactions({ counterpartyId: id, limit: 50 })
  const contact = contacts.data?.find((item) => item.id === id)

  if (contacts.isPending) {
    return (
      <div className="grid gap-6 py-10" aria-busy="true">
        <ListSkeleton rows={4} />
      </div>
    )
  }
  if (contacts.error) {
    return (
      <p role="alert" className="py-10 text-sm text-destructive">
        {contacts.error.message}
      </p>
    )
  }

  if (!contact) {
    return (
      <div className="grid gap-6 py-10">
        <BackToContacts search={listSearch} />
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{m.contacts_not_found()}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <>
      <nav aria-label={m.nav_contacts()} className="pt-6 md:pt-10">
        <BackToContacts search={listSearch} />
      </nav>

      <header className="grid gap-8 pt-6 pb-8 md:pb-12 lg:grid-cols-12 lg:items-end lg:gap-x-12">
        <div className="grid gap-4 lg:col-span-8">
          <h1 className="type-title font-medium text-ink">{contact.name}</h1>
          <Badge variant="secondary">{kindTag(contact.kind)}</Badge>
          <div className="mt-4 grid gap-2">
            <ContactTotals contact={contact} primaryCurrency={settings?.primaryCurrency} size="page" />
          </div>
        </div>
        <div className="lg:col-span-4 lg:justify-self-end">
          <NewTransactionDialog
            trigger={<Button variant="outline">{m.transactions_new()}</Button>}
            defaultCounterpartyId={contact.id}
          />
        </div>
      </header>

      <Section
        index="01"
        label={m.transactions_title()}
        action={
          movements.data && movements.data.length > 0 ? (
            <Button variant="link" asChild>
              <Link to="/transactions" search={{ counterpartyId: contact.id }}>
                {m.action_view_all()}
                <span aria-hidden>→</span>
              </Link>
            </Button>
          ) : null
        }
      >
        {movements.isPending ? (
          <ListSkeleton rows={4} />
        ) : movements.error ? (
          <p role="alert" className="text-sm text-destructive">
            {movements.error.message}
          </p>
        ) : movements.data.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{m.contacts_no_movements()}</EmptyTitle>
              <EmptyDescription>{m.contacts_no_movements_description({ name: contact.name })}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <NewTransactionDialog
                trigger={<Button variant="outline">{m.transactions_new()}</Button>}
                defaultCounterpartyId={contact.id}
              />
            </EmptyContent>
          </Empty>
        ) : (
          <ul className={rowsClass}>
            {movements.data.map((transaction) => (
              // The contact's name is already the page's title; the row does not repeat it.
              <TransactionRow key={transaction.id} transaction={transaction} showCounterparty={false} />
            ))}
          </ul>
        )}
      </Section>
    </>
  )
}

function BackToContacts({ search }: { search: { kind?: 'all' | 'person' | 'business'; search?: string } }) {
  return (
    <Link
      to="/contacts"
      search={search}
      className="label-mono group inline-flex gap-2 text-muted-foreground hover:text-ink"
    >
      <span aria-hidden className="transition-transform duration-500 group-hover:-translate-x-1">
        ←
      </span>
      {m.nav_contacts()}
    </Link>
  )
}
