import { useState } from 'react'
import { m } from '#/shared/i18n'
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
import { useCounterparties, useCreateCounterparty, type NewCounterparty } from './counterparties-api'

function NewContactForm({ close }: { close: () => void }) {
  const [kind, setKind] = useState<NewCounterparty['kind']>('person')
  const create = useCreateCounterparty()

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
        <Field>
          <FieldLabel htmlFor="contact-name">{m.label_name()}</FieldLabel>
          <Input id="contact-name" name="name" required maxLength={80} autoFocus />
        </Field>
        <FieldError>{create.error?.message}</FieldError>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            {m.action_cancel()}
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending && <Spinner data-icon="inline-start" />}
            {m.action_create()}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

export function ContactsPage() {
  const [search, setSearch] = useState('')
  const contacts = useCounterparties()

  const matching = (kind: 'person' | 'business') =>
    (contacts.data ?? [])
      .filter((contact) => contact.kind === kind)
      .filter((contact) => contact.name.toLowerCase().includes(search.toLowerCase()))

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

      <Field className="max-w-md">
        <FieldLabel htmlFor="contacts-search">{m.contacts_search()}</FieldLabel>
        <Input
          id="contacts-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </Field>

      {contacts.isPending ? (
        <ListSkeleton rows={4} />
      ) : contacts.error ? (
        <p role="alert" className="text-sm text-destructive">
          {contacts.error.message}
        </p>
      ) : (contacts.data ?? []).length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{m.contacts_empty()}</EmptyTitle>
            <EmptyDescription>{m.contacts_empty_description()}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="pt-4">
          {(['person', 'business'] as const).map((kind, index) => (
            <Section
              key={kind}
              index={String(index + 1).padStart(2, '0')}
              label={kind === 'person' ? m.contacts_people() : m.contacts_businesses()}
            >
              <ul className={rowsClass}>
                {matching(kind).map((contact) => (
                  <li key={contact.id} className="py-4 text-ink sm:type-heading-sm">
                    {contact.name}
                  </li>
                ))}
              </ul>
            </Section>
          ))}
        </div>
      )}
    </>
  )
}
