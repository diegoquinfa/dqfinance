import { Autocomplete as AutocompletePrimitive, Combobox as ComboboxPrimitive } from "@base-ui/react"
import { cn } from "cn"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { m } from "#/shared/i18n"
import { fieldClass } from "#/shared/ui/input"

/** Pick one item from a long list by typing. `items` drives the filter; `name` submits the value. */
const Combobox = ComboboxPrimitive.Root

/**
 * Free text with suggestions, the `<datalist>` replacement: `value` is the input text, so a name
 * that is not in the list is still valid. It shares Input, Content, List and Empty with Combobox.
 */
const Autocomplete = AutocompletePrimitive.Root

/** Looks like Input. The chevron opens the full list; Autocomplete has none, like a datalist. */
function ComboboxInput({
  className,
  showTrigger = true,
  ...props
}: ComboboxPrimitive.Input.Props & { showTrigger?: boolean }) {
  return (
    <div data-slot="combobox-input" className="relative">
      <ComboboxPrimitive.Input className={cn(fieldClass, showTrigger && "pr-10", className)} {...props} />
      {showTrigger && (
        <ComboboxPrimitive.Trigger
          aria-label={m.action_show_options()}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-ink"
        >
          <ChevronDownIcon className="size-4" />
        </ComboboxPrimitive.Trigger>
      )}
    </div>
  )
}

/** A raised hairline panel under the input, as wide as it. Hidden when nothing matches. */
function ComboboxContent({
  className,
  sideOffset = 4,
  ...props
}: ComboboxPrimitive.Popup.Props & Pick<ComboboxPrimitive.Positioner.Props, "sideOffset">) {
  return (
    <ComboboxPrimitive.Portal>
      {/* An open Radix dialog sets `pointer-events: none` on body, where this portal lands. */}
      <ComboboxPrimitive.Positioner sideOffset={sideOffset} align="start" className="pointer-events-auto isolate z-50">
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(
            "w-(--anchor-width) max-w-(--available-width) border border-line bg-raised text-ink duration-300 data-closed:animate-out data-closed:fade-out-0 data-open:animate-in data-open:fade-in-0",
            className
          )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn("max-h-[min(20rem,var(--available-height))] scroll-py-1 overflow-y-auto p-1 data-empty:p-0", className)}
      {...props}
    />
  )
}

/** Rows in `soft`; the highlighted one gets `surface` and `ink`. Same look as SelectItem. */
const itemClass =
  "relative flex w-full cursor-default items-center gap-2 py-2.5 pr-9 pl-2.5 text-base text-soft select-none data-highlighted:bg-surface data-highlighted:text-ink data-selected:text-ink data-disabled:pointer-events-none data-disabled:opacity-50"

function ComboboxItem({ className, children, ...props }: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item data-slot="combobox-item" className={cn(itemClass, className)} {...props}>
      {children}
      <ComboboxPrimitive.ItemIndicator className="pointer-events-none absolute right-2.5 flex size-4 items-center justify-center">
        <CheckIcon className="size-4" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  )
}

function AutocompleteItem({ className, ...props }: AutocompletePrimitive.Item.Props) {
  return <AutocompletePrimitive.Item data-slot="autocomplete-item" className={cn(itemClass, className)} {...props} />
}

/** Renders its children only when nothing matches; `empty:` keeps the box from showing otherwise. */
function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn("px-2.5 py-3 text-sm text-muted-foreground empty:hidden", className)}
      {...props}
    />
  )
}

export {
  Autocomplete,
  AutocompleteItem,
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
}
