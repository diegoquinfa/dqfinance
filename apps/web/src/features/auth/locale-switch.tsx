import { useState } from 'react'
import { currentLocale, localeNames, m, switchLocale, type Locale } from '#/shared/i18n'
import { Field, FieldLabel } from '#/shared/ui/field'
import { NativeSelect } from '#/shared/ui/native-select'

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
      <NativeSelect
        id={id}
        value={currentLocale()}
        disabled={pending}
        onChange={async (event) => {
          const next = event.target.value as Locale
          setPending(true)
          try {
            await persist?.(next)
            switchLocale(next)
          } finally {
            setPending(false)
          }
        }}
      >
        {Object.entries(localeNames).map(([code, name]) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </NativeSelect>
    </Field>
  )
}
