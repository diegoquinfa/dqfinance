import { cn } from 'cn'

/** Radio group styled as a segmented control. Used for expense/income and other short either-or choices. */
export function Segmented<T extends string>({
  name,
  value,
  options,
  onChange,
  className,
}: {
  name: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <fieldset className={cn('grid rounded-md bg-muted p-1', className)} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      <legend className="sr-only">{name}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            'cursor-pointer rounded-sm py-1.5 text-center text-sm font-medium text-muted-foreground transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring',
            value === option.value && 'bg-card text-foreground shadow-sm',
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  )
}
