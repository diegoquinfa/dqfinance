import { useState } from 'react'
import { m } from '#/shared/i18n'
import { Autocomplete, AutocompleteItem, ComboboxContent, ComboboxInput, ComboboxList } from '#/shared/ui/combobox'
import { Field, FieldDescription, FieldLabel } from '#/shared/ui/field'
import { useCounterparties, useCreateCounterparty } from './counterparties-api'

const nameOf = (contact: { name: string }) => contact.name.trim().toLowerCase()

/** The contact behind the typed name: one already there, or a new one. Empty names stay unlinked. */
export function useContactId() {
  const contacts = useCounterparties({})
  const create = useCreateCounterparty()
  return async (typed: string) => {
    const name = typed.trim()
    if (!name) return undefined
    const name_ = name.toLowerCase()
    const match = (rows: { id: string; name: string }[]) => rows.find((contact) => nameOf(contact) === name_)
    const cached = contacts.data ?? []
    const existing = match(cached)
    if (existing) return existing.id
    // The list can be out of date; ask again before creating a second contact with the same name.
    const fresh = (await contacts.refetch()).data ?? cached
    const again = match(fresh)
    if (again) return again.id
    const created = await create.mutateAsync({ name, kind: 'person' })
    return created.id
  }
}

/**
 * The contact of a recurring expense or an expected income: the names already there are suggested,
 * and one that is not becomes a contact when the form is sent. Its kind starts as a person, and the
 * contacts page renames it or changes it.
 */
export function ContactField({ id }: { id: string }) {  const contacts = useCounterparties({})
  const [text, setText] = useState('')
  const names = (contacts.data ?? []).map((contact) => contact.name)
  const matched = (contacts.data ?? []).find((contact) => nameOf(contact) === text.trim().toLowerCase())

  return (
    <Field>
      <FieldLabel htmlFor={id}>{`${m.label_contact()} (${m.label_optional()})`}</FieldLabel>
      <Autocomplete items={names} name="counterparty" value={text} onValueChange={setText}>
        <ComboboxInput id={id} showTrigger={false} maxLength={80} />
        {/* Like a datalist, nothing shows when no suggestion matches. */}
        <ComboboxContent className="data-empty:hidden">
          <ComboboxList>
            {(name: string) => (
              <AutocompleteItem key={name} value={name}>
                {name}
              </AutocompleteItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Autocomplete>
      <FieldDescription>
        {!text.trim()
          ? m.contacts_field_hint()
          : matched
            ? m.contacts_field_reuse({ name: matched.name })
            : m.contacts_field_create({ name: text.trim() })}
      </FieldDescription>
    </Field>
  )
}
