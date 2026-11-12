# Components

`shared/ui` holds shadcn/ui primitives restyled with the tokens. The tokens, the type scale, the
layout and the shell stay in [DESIGN.md](../DESIGN.md). Add a component with
`pnpm dlx shadcn@latest add <name>` from `apps/web`, then run the checklist below.

Checklist for every added component:

- No `rounded-*`; `rounded-full` only for dots.
- No `shadow-*`.
- No `ring-*` focus styles and no `outline-none`: focus is the global 1px `signal` outline with a 4px offset (`styles.css`) plus the amount field's bottom line.
- Colors only by token: `ink`, `soft`, `muted-foreground`, `faint`, `canvas`, `raised`, `surface`, `line`, `line-strong`, `signal`, `income`, `destructive`.
- Form labels, metadata and the `// 0X` markers are `label-mono`; a section's label is `type-heading` in `ink`; weights stay 400 or 500.
- Lists stay hairline rows (`rowsClass`), not a box per item.
- Every string comes from `packages/i18n`, both catalogs; hyphens, never em or en dashes.

| Component | Notes |
| --- | --- |
| `Button` | `default`: `ink` on `canvas`, hover `signal`, one per view at most (the top bar or the "+" holds it). `outline`: page actions ("New contact", "Adjust balance", Confirm). `ghost`: icon buttons, Cancel, Skip. `link`: inline text with a drawn underline, for actions inside a section rail; it takes no box size. |
| `Input` | Filled `surface`, square, 44px, 16px text (no iOS zoom). Border appears on hover/focus. |
| `Select`, `Combobox`, `Autocomplete` | The trigger or input looks like `Input`; the list is a `raised` hairline panel under it, as wide as it, with `soft` rows that turn `surface` + `ink` when highlighted, a check on the chosen one, and `label-mono` group labels. `Select` (Radix) for short fixed lists; `CodeCombobox` (Base UI) to search long `{ code, label }` lists like countries and currencies; `Autocomplete` for free text with suggestions, like a bank's name. A select's "None" is the item `""` plus the same text as placeholder. No native `<select>` or `<datalist>`: Windows paints their lists with the system theme. |
| `Label`, `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldGroup` | Forms are `FieldGroup` + `Field`: mono label above, control, description or error below. Validation sets `data-invalid` on the field and `aria-invalid` on the control; errors are `role="alert"`. |
| `ToggleGroup` | Square mono chips with a hairline frame; the chosen one is inverted (`bg-ink text-canvas`). Expense/income, periods, filters. A single-select group never empties: the empty value of a second click is dropped. |
| `Badge` | Mono tag with a hairline border: product type, currency, in transit. |
| `Card` | Only for raised surfaces: the auth and consent panels. |
| `Dialog`, `DialogPanel`, `AlertDialog` | Bottom sheet on mobile, centered square panel from `sm`. Overlay `canvas` at 90 %, no blur. `AlertDialog` confirms what runs immediately, like deleting a recurring expense. |
| `Empty` | Empty states, left aligned, hairlines above and below, with an optional action. |
| `Avatar`, `DropdownMenu` | The account: a square avatar with initials (mono), its dropdown names the user and offers Settings and Sign out. |
| `Sidebar` | The desktop rail (from `xl`): shadcn `Sidebar` primitives, square, shadowless and token-only, `canvas` with a hairline on its right edge. Mono labels, the current row in `ink` with a 1px `signal` mark at its left edge; collapsed to the 3rem icon rail, each row shows its label in a tooltip. |
| `Tooltip` | The label of a collapsed rail row, on its right. A square `raised` panel with a `line` hairline and `label-mono` text, no arrow and no shadow. |
| `Skeleton`, `ListSkeleton` | Loading states shaped like what they replace: `Skeleton` is a bare `surface` block, `ListSkeleton` is hairline rows. |
| `Spinner` | Only inside a pending button, next to its text; the button also gets `disabled`. |
| `Separator` | A lone divider line, where a `border-t` used to be. List rows keep `divide-y` through `rowsClass`. |
| `Toaster` (sonner) | Mounted once in the root route. A successful create confirms with `toast.success(...)`; never for reads. |
| `PageHeader`, `Section`, `Eyebrow`, `FocusLayout` | `shared/ui/page.tsx`: the page h1, the rail sections, the `// 0X` marker, and the signed-out layout (two-tone statement + panel). A section heading is two lines: the `// 0X` index above the label in `type-heading`. |
| `TransactionRow` | `features/transactions`: title in `ink`, mono metadata (`date / source / category`), the signed amount on the right. Every movement list uses it. |
| `Chart` | `shared/ui/chart.tsx` wraps Recharts (the only chart dependency). Lines only: assets solid in `ink`, liabilities dashed in `muted-foreground`, so the dash tells them apart without relying on tone. A mono legend beside the title, a `line` grid, mono ticks with compact amounts on the Y axis (`150 mil`), a `line-strong` cursor, no area fills, no lilac, no animation. The tooltip is a square hairline panel with the month, then each series label beside its `formatMoney` value; the region carries an `aria-label` and the same points sit in an `sr-only` table beside it. |
| `Table` | Data with more than two columns, like the statement import preview: mono headers, hairline rows, no box, no zebra. |
| `Textarea` | Pasted statement rows: filled `surface`, mono, grows with what it holds. A movement's description uses it too, in sans. |
| `CardFace` | `features/accounts/card-face.tsx`: the 1.586 square-cornered face on a product's card page, with its color, brand (`label-mono`) and masked last 4. |

States: hover changes tone or moves a row title 4px right, never size. Focus is a 1px `signal`
outline with a 4px offset (global); the amount field shows focus on its bottom line. Disabled is
`opacity-50`.
