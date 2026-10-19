import { m } from '#/shared/i18n'
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '#/shared/ui/combobox'

type CodeItem = { code: string; label: string }

/**
 * Searchable pick from a long `{ code, label }` list (countries, currencies). Speaks codes: `value`,
 * `onValueChange` and the submitted `name` all carry the code, the input shows the label. Once
 * chosen, a value is never cleared.
 */
export function CodeCombobox({
  id,
  items,
  value,
  defaultValue,
  onValueChange,
  name,
  required,
}: {
  id: string
  items: CodeItem[]
  value?: string
  defaultValue?: string
  onValueChange?: (code: string) => void
  name?: string
  required?: boolean
}) {
  const find = (code: string | undefined) => items.find((item) => item.code === code) ?? null
  return (
    <Combobox
      items={items}
      {...(value !== undefined && { value: find(value) })}
      defaultValue={find(defaultValue)}
      // Clearing the text is not a choice: like the select it replaces, the field keeps its value.
      onValueChange={(item: CodeItem | null) => item && onValueChange?.(item.code)}
      itemToStringLabel={(item: CodeItem) => item.label}
      itemToStringValue={(item: CodeItem) => item.code}
      // Callers may rebuild the list on render, so compare by code, not identity.
      isItemEqualToValue={(item: CodeItem, selected: CodeItem) => item.code === selected.code}
      name={name}
      required={required}
    >
      <ComboboxInput id={id} />
      <ComboboxContent>
        <ComboboxEmpty>{m.label_no_results()}</ComboboxEmpty>
        <ComboboxList>
          {(item: CodeItem) => (
            <ComboboxItem key={item.code} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
