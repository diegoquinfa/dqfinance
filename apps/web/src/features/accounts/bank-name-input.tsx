import { Autocomplete, AutocompleteItem, ComboboxContent, ComboboxInput, ComboboxList } from '#/shared/ui/combobox'

/** A bank's name: free text, with the country's known banks suggested as the user types. */
export function BankNameInput({
  id,
  name,
  suggestions,
  value,
  onValueChange,
  autoFocus,
}: {
  id: string
  name: string
  suggestions: string[]
  value?: string
  onValueChange?: (text: string) => void
  autoFocus?: boolean
}) {
  return (
    <Autocomplete items={suggestions} name={name} required value={value} onValueChange={onValueChange}>
      <ComboboxInput id={id} showTrigger={false} maxLength={80} autoFocus={autoFocus} />
      {/* Like a datalist, nothing shows when no suggestion matches. */}
      <ComboboxContent className="data-empty:hidden">
        <ComboboxList>
          {(bank: string) => (
            <AutocompleteItem key={bank} value={bank}>
              {bank}
            </AutocompleteItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Autocomplete>
  )
}
