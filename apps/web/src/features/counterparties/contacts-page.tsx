import { useState, type FormEvent } from 'react'
import { m } from '#/shared/i18n'
import { Badge } from '#/shared/ui/badge'
import { Button } from '#/shared/ui/button'
import { DialogPanel } from '#/shared/ui/dialog-panel'
import { EmptyState, Field, FormError, ListSkeleton } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { Segmented } from '#/shared/ui/segmented'
import { useCounterparties, useCreateCounterparty, type NewCounterparty } from './counterparties-api'

function NewContactForm({ close }: { close: () => void }) {
  const [kind, setKind] = useState<NewCounterparty['kind']>('person')
  const create = useCreateCounterparty()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    create.mutate({ name: String(form.get('name')), kind }, { onSuccess: close })
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <Segmented
        name={m.label_kind()}
        value={kind}
        onChange={setKind}
        options={[
          { value: 'person', label: m.label_person() },
          { value: 'business', label: m.label_business() },
        ]}
      />
      <Field id="contact-name" label={m.label_name()}>
        <Input id="contact-name" name="name" required maxLength={80} autoFocus />
      </Field>
      <FormError message={create.error?.message} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={close}>
          {m.action_cancel()}
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {m.action_create()}
        </Button>
      </div>
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
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{m.contacts_title()}</h1>
        <DialogPanel trigger={<Button>{m.contacts_new()}</Button>} title={m.contacts_new()}>
          {(close) => <NewContactForm close={close} />}
        </DialogPanel>
      </div>

      <Field id="contacts-search" label={m.contacts_search()}>
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
        <EmptyState title={m.contacts_empty()} description={m.contacts_empty_description()} />
      ) : (
        <div className="grid gap-8">
          {(['person', 'business'] as const).map((kind) => (
            <section key={kind} className="grid gap-3">
              <h2 className="border-b pb-2 font-semibold">
                {kind === 'person' ? m.contacts_people() : m.contacts_businesses()}
              </h2>
              <ul className="grid gap-2">
                {matching(kind).map((contact) => (
                  <li key={contact.id} className="flex items-center justify-between rounded-lg border px-4 py-2">
                    <span>{contact.name}</span>
                    <Badge variant="secondary" className="font-normal">
                      {kind === 'person' ? m.label_person() : m.label_business()}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
