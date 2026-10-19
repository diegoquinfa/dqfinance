import { cn } from 'cn'

/** Radio group styled as square chips; the chosen one is inverted. Expense/income, periods, filters. */
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
    <fieldset
      className={cn('grid border border-line', className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <legend className="sr-only">{name}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            'label-mono flex h-10 cursor-pointer items-center justify-center px-2 text-center whitespace-nowrap text-muted-foreground transition-colors duration-300 hover:text-ink has-focus-visible:outline has-focus-visible:outline-1 has-focus-visible:outline-offset-4 has-focus-visible:outline-signal',
            value === option.value && 'bg-ink text-canvas hover:text-canvas',
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
