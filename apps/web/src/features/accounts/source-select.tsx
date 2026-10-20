import { useMemo } from 'react'
import { m } from '#/shared/i18n'
import { Field, FieldDescription, FieldError, FieldLabel } from '#/shared/ui/field'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '#/shared/ui/select'
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
  emptyLabel = m.label_none(),
}: {
  id: string
  label: string
  hint?: string
  error?: string
  options: SourceOption[]
  value: string
  onChange: (key: string) => void
  className?: string
  /** What the empty choice says: "None" in a form, "All sources" in a filter. */
  emptyLabel?: string
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
      <Select value={value} onValueChange={onChange} required>
        <SelectTrigger id={id} aria-invalid={Boolean(error)}>
          <SelectValue placeholder={emptyLabel} />
        </SelectTrigger>
        <SelectContent>
          {/* A filter clears back to "None"; `required` still blocks an empty form submit. */}
          <SelectItem value="">{emptyLabel}</SelectItem>
          {groups.map(([group, groupOptions]) => (
            <SelectGroup key={group}>
              <SelectLabel>{group}</SelectLabel>
              {groupOptions.map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  {option.label} · {option.currency}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      {error ? <FieldError>{error}</FieldError> : hint ? <FieldDescription>{hint}</FieldDescription> : null}
    </Field>
  )
}
