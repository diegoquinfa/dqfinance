import { useState } from 'react'
import { currentLocale, localeNames, m, switchLocale, type Locale } from '#/shared/i18n'
import { Field, FieldLabel } from '#/shared/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/shared/ui/select'

/**
 * Language picker. `persist` saves the preference (the signed-in shell applies the saved value on
 * load, so an unsaved switch would be undone on the next reload). Switching reloads the page.
 */
export function LocaleSwitch({
  id = 'locale',
  persist,
}: {
  id?: string
  persist?: (locale: Locale) => Promise<unknown>
}) {
  const [pending, setPending] = useState(false)

  return (
    <Field>
      <FieldLabel htmlFor={id}>{m.label_language()}</FieldLabel>
      <Select
        value={currentLocale()}
        disabled={pending}
        onValueChange={async (value) => {
          const next = value as Locale
          setPending(true)
          try {
            await persist?.(next)
          } catch {
            // The save failed, so the language stays as it was; keep the select usable.
            setPending(false)
            return
          }
          // Switching reloads the page, so it happens once the preference is stored.
          switchLocale(next)
        }}
      >
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(localeNames).map(([code, name]) => (
            <SelectItem key={code} value={code}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
