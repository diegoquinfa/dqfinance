import { useMemo } from 'react'
import { m } from '#/shared/i18n'
import { Field, FieldDescription, FieldError, FieldLabel } from '#/shared/ui/field'
import { NativeSelect } from '#/shared/ui/native-select'
import type { SourceOption } from './sources'

/** Grouped source picker (bank, then account-level items). The empty option clears the choice. */
export function SourceSelect({
  id,
  label,
  hint,
  error,
  options,
  value,
  onChange,
  className,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  options: SourceOption[]
  value: string
  onChange: (key: string) => void
  className?: string
}) {
  const groups = useMemo(() => {
    const byGroup = new Map<string, SourceOption[]>()
    for (const option of options) {
      const group = byGroup.get(option.group) ?? []
      group.push(option)
      byGroup.set(option.group, group)
    }
    return [...byGroup]
  }, [options])

  return (
    <Field className={className} data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect
        id={id}
        value={value}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
        required
      >
        {/* No `disabled`: a filter clears back to "None"; `required` still blocks an empty form submit. */}
        <option value="">
          {m.label_none()}
        </option>
        {groups.map(([group, groupOptions]) => (
          <optgroup key={group} label={group}>
            {groupOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label} · {option.currency}
              </option>
            ))}
          </optgroup>
        ))}
      </NativeSelect>
      {error ? <FieldError>{error}</FieldError> : hint ? <FieldDescription>{hint}</FieldDescription> : null}
    </Field>
  )
}
