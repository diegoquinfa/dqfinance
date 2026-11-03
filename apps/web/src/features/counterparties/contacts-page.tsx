import { useNavigate, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { useSettings } from '#/features/settings/settings-api'
import { todayDate } from '#/shared/dates'
import { m } from '#/shared/i18n'
import { lastMonths } from '#/shared/periods'
import { Button } from '#/shared/ui/button'
import { DialogPanel } from '#/shared/ui/dialog-panel'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '#/shared/ui/empty'
import { Field, FieldError, FieldGroup, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { ListSkeleton } from '#/shared/ui/list-skeleton'
import { PageHeader, Section, rowsClass } from '#/shared/ui/page'
import { Spinner } from '#/shared/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '#/shared/ui/toggle-group'
import { toast } from 'sonner'
import { ContactCompareChart } from './contact-compare-chart'
import { ContactRow } from './contact-row'
import {
  useCounterparties,
  useCounterpartiesDetail,
  useCreateCounterparty,
  type CounterpartyKind,
  type NewCounterparty,
} from './counterparties-api'
import { useDebounced } from './use-debounced'
import type { CompareContact } from './compare-points'

type KindFilter = CounterpartyKind | 'all'
type Months = '6' | '12'

function NewContactForm({ close }: { close: () => void }) {
  const [kind, setKind] = useState<NewCounterparty['kind']>('person')
  const [name, setName] = useState('')
  const create = useCreateCounterparty()
  // The API's search finds the name that is already there: a contact with the same name is a duplicate.
  const term = useDebounced(name.trim())
  const matches = useCounterparties({ search: term || undefined }, { enabled: term.length >= 2 })
  const duplicate = (matches.data ?? []).find((contact) => contact.name.trim().toLowerCase() === term.toLowerCase())

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // A contact with the same name is a duplicate: it is not created.
    if (duplicate) return
    const form = new FormData(event.currentTarget)
    create.mutate(
      { name: String(form.get('name')), kind },
      {
        onSuccess: () => {
          close()
          toast.success(m.toast_contact_created())
        },
      },
    )
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <ToggleGroup
          type="single"
          className="w-full"
          aria-label={m.label_kind()}
          value={kind}
          onValueChange={(value) => setKind(value as NewCounterparty['kind'])}
        >
          <ToggleGroupItem value="person">{m.label_person()}</ToggleGroupItem>
          <ToggleGroupItem value="business">{m.label_business()}</ToggleGroupItem>
        </ToggleGroup>
        <Field data-invalid={Boolean(duplicate)}>
          <FieldLabel htmlFor="contact-name">{m.label_name()}</FieldLabel>
          <Input
            id="contact-name"
            name="name"
            required
            maxLength={80}
            autoFocus
            aria-invalid={Boolean(duplicate)}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          {duplicate && <FieldError>{m.contacts_duplicate_warning()}</FieldError>}
        </Field>
        <FieldError>{create.error?.message}</FieldError>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            {m.action_cancel()}
          </Button>
          <Button type="submit" disabled={create.isPending || Boolean(duplicate)}>
            {create.isPending && <Spinner data-icon="inline-start" />}
            {m.action_create()}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

export function ContactsPage() {
  // The filters live in the URL (see routes/_app/contacts.tsx), so they survive a reload.
  const search = useSearch({ from: '/_app/contacts' })
  const navigate = useNavigate()
  const { data: settings } = useSettings()
  const [months, setMonths] = useState<Months>('12')
  const kind = search.kind ?? 'all'
  const term = search.search ?? ''
  // The chosen contacts travel in the URL too: a reload or a shared link keeps the comparison.
  const compare = (search.compare ?? '').split(',').filter(Boolean)
  // The list comes from the server; the search waits for the person to stop typing.
  const debounced = useDebounced(term)
  const contacts = useCounterparties({
    kind: kind === 'all' ? undefined : kind,
    search: debounced.trim() || undefined,
  })
  const period = lastMonths(Number(months), todayDate())
  const details = useCounterpartiesDetail(compare, { from: period.from })
  const chosen: CompareContact[] = details.flatMap((detail, index) =>
    detail.data ? [{ id: compare[index]!, name: detail.data.name, monthly: detail.data.monthly }] : [],
  )
  const comparing = details.some((detail) => detail.isPending)
  const currency =
    settings?.primaryCurrency ?? chosen.find((contact) => contact.monthly.length > 0)?.monthly[0]?.currency ?? ''

  const setFilters = (patch: Partial<typeof search>) =>
    void navigate({ to: '/contacts', search: (previous) => ({ ...previous, ...patch }), replace: true })

  return (
    <>
      <PageHeader
        title={m.contacts_title()}
        actions={
          <DialogPanel trigger={<Button variant="outline">{m.contacts_new()}</Button>} title={m.contacts_new()}>
            {(close) => <NewContactForm close={close} />}
          </DialogPanel>
        }
      />

      <section aria-label={m.contacts_filters()} className="grid items-end gap-4 pb-8 sm:grid-cols-2 lg:grid-cols-4">
        <ToggleGroup
          type="single"
          className="w-full sm:col-span-2 lg:col-span-1"
          aria-label={m.label_kind()}
          value={kind}
          onValueChange={(value) => setFilters({ kind: value as KindFilter })}
        >
          <ToggleGroupItem value="all">{m.contacts_filter_all()}</ToggleGroupItem>
          <ToggleGroupItem value="person">{m.contacts_people()}</ToggleGroupItem>
          <ToggleGroupItem value="business">{m.contacts_businesses()}</ToggleGroupItem>
        </ToggleGroup>
        <Field className="sm:col-span-2 lg:col-span-1">
          <FieldLabel htmlFor="contacts-search">{m.contacts_search()}</FieldLabel>
          <Input
            id="contacts-search"
            type="search"
            value={term}
            onChange={(event) => setFilters({ search: event.target.value || undefined })}
          />
        </Field>
      </section>

      {contacts.data && contacts.data.length > 0 && (
        <Section
          index="01"
          label={m.contacts_compare()}
          action={
            compare.length > 0 ? (
              <ToggleGroup
                type="single"
                size="sm"
                className="w-28"
                aria-label={m.contacts_period()}
                value={months}
                onValueChange={(value) => setMonths(value as Months)}
              >
                <ToggleGroupItem value="6">{m.period_months({ count: 6 })}</ToggleGroupItem>
                <ToggleGroupItem value="12">{m.period_months({ count: 12 })}</ToggleGroupItem>
              </ToggleGroup>
            ) : null
          }
        >
          <div className="grid gap-6">
            {/* Every listed contact is a chip: the search above narrows the list, and so the chips. */}
            <ToggleGroup
              type="multiple"
              className="flex-wrap"
              aria-label={m.contacts_compare_choose()}
              value={compare}
              onValueChange={(value) => setFilters({ compare: (value as string[]).join(',') || undefined })}
            >
              {(contacts.data ?? []).map((contact) => (
                <ToggleGroupItem key={contact.id} value={contact.id}>
                  {contact.name}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            {compare.length === 0 ? (
              <p className="text-sm text-muted-foreground">{m.contacts_compare_hint()}</p>
            ) : comparing ? (
              <ListSkeleton rows={2} />
            ) : currency && chosen.length > 0 ? (
              <ContactCompareChart contacts={chosen} currency={currency} />
            ) : null}
          </div>
        </Section>
      )}

      {contacts.isPending ? (
        <ListSkeleton rows={4} />
      ) : contacts.error ? (
        <p role="alert" className="text-sm text-destructive">
          {contacts.error.message}
        </p>
      ) : contacts.data.length === 0 ? (
        term ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{m.contacts_no_results_search({ search: term })}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : kind !== 'all' ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{m.contacts_no_results()}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{m.contacts_empty()}</EmptyTitle>
              <EmptyDescription>{m.contacts_empty_description()}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )
      ) : (
        <ul className={rowsClass}>
          {contacts.data.map((contact) => (
            <ContactRow
              key={contact.id}
              contact={contact}
              primaryCurrency={settings?.primaryCurrency}
              listSearch={{ kind, search: term || undefined }}
            />
          ))}
        </ul>
      )}
    </>
  )
}
