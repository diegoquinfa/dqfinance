import { Autocomplete, AutocompleteItem, ComboboxContent, ComboboxInput, ComboboxList } from '#/shared/ui/combobox'

/** A bank's name: free text, with the country's known banks suggested as the user types. */
export function BankNameInput({
  id,
  name,
  suggestions,
  autoFocus,
}: {
  id: string
  name: string
  suggestions: string[]
  autoFocus?: boolean
}) {
  return (
    <Autocomplete items={suggestions} name={name} required>
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
