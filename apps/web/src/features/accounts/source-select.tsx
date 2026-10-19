import { useMemo } from 'react'
import { Field } from '#/shared/ui/field'
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
    <Field id={id} label={label} hint={hint} error={error} className={className}>
      <NativeSelect id={id} value={value} onChange={(event) => onChange(event.target.value)} required>
        <option value="" disabled />
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
    </Field>
  )
}
