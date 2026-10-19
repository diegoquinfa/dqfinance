# DQFinance — Design

The UI borrows the editorial language of [diegoquinfa.dev](https://diegoquinfa.dev): a dark studio where numbers and type coexist. Hierarchy comes from **scale and tone**, not color: a balance can take half the screen while its metadata barely whispers below it. Lots of empty space, near-monochrome, one lilac signal, square corners, hairlines between rows. No glass, glow, gradients in text, or decorative shadows.

People open the app to answer "where did my money go?" and "did I record that?". Every screen answers those fast. Nothing competes with the numbers.

Tokens live in `apps/web/src/styles.css`. This file explains them. When the two disagree, fix whichever one is wrong in the same change.

## Principles for financial tracking

1. **Numbers first.** The amount is the largest, highest-contrast element of its block. Use `tabular-nums` everywhere digits stack.
2. **Expenses are normal, not alarming.** An expense uses `ink` with a `−` (U+2212). Income gets the `income` green and a `+`. Red (`destructive`) is reserved for errors.
3. **Never hide or invent precision.** Show cents when they exist (`$ 45.000,50`) and drop them when the amount is whole. Never round a stored value for display. Sums go through integer cents (`features/balances/totals.ts`).
4. **Recording must take under 10 seconds.** The "+" is always one tap away (bottom bar on mobile, top bar on desktop). The amount is the first, largest field and takes focus. Smart defaults: expense, today, the source's currency.
5. **Say who is acting.** The consent screen names the agent and lists permissions in plain language, never raw scopes.
6. **Honest states.** Every data view has a skeleton shaped like its layout, an empty state that explains how to start (including "ask your AI assistant"), and an inline error.
7. **Foreign-currency charges show both numbers.** A card charge in another currency shows what the card owes as the amount, with the original charge in mono below it. Card debt, net worth and reports stay in the card's currency.
8. **Currencies never mix.** There are no FX rates, so totals are per currency. The primary currency leads; others appear as smaller lines.
9. **The UI speaks the user's language.** Every string comes from `packages/i18n`; there are no literals.

## Color

Dark only. Use the tokens by name (`bg-canvas`, `text-muted-foreground`, `border-line`), never raw hex.

| Token | Value | Role |
| --- | --- | --- |
| `canvas` (= `background`) | `#0a0a0a` | Page, bars, menu |
| `raised` (= `card`, `popover`) | `#111111` | Dialogs, the auth panel |
| `surface` (= `muted`, `secondary`, `accent`) | `#181818` | Filled inputs, skeletons, hover backgrounds |
| `ink` (= `foreground`, `primary`) | `#f0f0ec` | Amounts, titles, active links, the primary button. Aged white, never `#fff` |
| `soft` | `#c6c6c0` | Secondary amounts, tags (11.5:1) |
| `muted-foreground` | `#9d9d98` | Labels, metadata, dates (7.2:1) |
| `faint` | `#5c5c58` | Decorative only: `/` separators, row indices, arrows at rest |
| `line` / `line-strong` | `#272727` / `#3a3a3a` | Hairlines / chip and outline-button borders |
| `signal` (= `ring`) | `#a78bfa` | The `//` marker of section labels, the active tab mark, focus, hover of the primary button |
| `income` | `#6fd09c` | Income amounts only |
| `destructive` | `#f2726b` | Errors only |

The shadcn names (`background`, `card`, `primary`...) map onto these values so the primitives keep working; `signal` exists because shadcn's `accent` is a hover background.

Rules:

- Contrast lives in a few points: the primary button, the big numbers, small lilac marks. Never lilac backgrounds, icons, or resting buttons.
- Every text pair passes WCAG AA. `faint` is never used for text a person must read.

## Typography

**Geist Sans** for everything a person reads; **Geist Mono** (`label-mono`: 11px, uppercase, 0.16em tracking) for the technical voice: navigation, section labels, form labels, dates, metadata, tags. Do not invent other mono sizes.

Two weights only: 400 and 500. Never bold; emphasize by raising the tone (`muted-foreground` → `ink`).

| Utility | Size | Use |
| --- | --- | --- |
| `type-display` | clamp 40 → 76px | The hero balance, a source's balance |
| `type-title` | clamp 32 → 56px | Page h1, the amount field, the auth statement |
| `type-heading` | clamp 24 → 36px | Net worth, period totals, menu links, a source's name |
| `type-heading-sm` | 20px | Dialog and panel titles, row names from `sm` up |
| `text-base` / `text-sm` | 16 / 14px | Rows and prose / hints and errors |
| `label-mono` | 11px mono | All metadata |

The scale is `@utility type-*`, not `--text-*` theme sizes: `cn` (tailwind-merge) would read `text-display` as a color and drop it next to `text-ink`.

## Layout

- One container: `container-page` (max 1360px, gutters 20 / 48 / 80px).
- 12 columns with `gap-x-12` from `lg`. **Controlled asymmetry:** labels left, content right.
- `Section` (`shared/ui/page.tsx`) has two layouts. `rail` (default): the `// 0X Label` eyebrow in columns 1-3, content in 4-12, and its action ("View all →", "Add account") under the label. `stack`: label on top, content at full width. Below `lg` both collapse to one column with the action beside the label.
- Sections are separated by space (`py-8 md:py-12`), never by lines or alternating backgrounds.
- Lists are hairline rows (`rowsClass`: a line above every row and one closing the list). Never one box per item.
- Corners are square everywhere (every `--radius-*` is 0). `rounded-full` remains only for dots.
- Mobile first: the main content leaves room for the bottom bar (`pb-32`), and dialogs become bottom sheets.

## Shell

- **Top bar** (64px, `canvas` + hairline, sticky): `DQFINANCE` in mono on the left. From `xl`, the seven mono links with a drawn underline (`link-draw`) and `ink` for the current page. From `lg`, the primary "New movement" button. Below `xl`, "Menu" opens a full-screen menu with large numbered links (`01`... in `faint`, the current one in `signal`), the email, and "Sign out".
- **Bottom bar** (below `lg`): Overview, Movements, Accounts, Recurring as icons (accessible names in `sr-only`), the current one in `ink` with a 1px lilac mark on top, and a square `ink` "+" that opens New movement.

## Components

`shared/ui` holds shadcn/ui primitives restyled with the tokens. Add more with `pnpm dlx shadcn@latest add <name>` from `apps/web`, then run the checklist below.

Checklist for every added component:

- No `rounded-*`; `rounded-full` only for dots.
- No `shadow-*`.
- No `ring-*` focus styles and no `outline-none`: focus is the global 1px `signal` outline with a 4px offset (`styles.css`) plus the amount field's bottom line.
- Colors only by token: `ink`, `soft`, `muted-foreground`, `faint`, `canvas`, `raised`, `surface`, `line`, `line-strong`, `signal`, `income`, `destructive`.
- Labels use `label-mono`; weights stay 400 or 500.
- Lists stay hairline rows (`rowsClass`), not a box per item.
- Every string comes from `packages/i18n`, both catalogs; hyphens, never em or en dashes.

| Component | Notes |
| --- | --- |
| `Button` | `default`: `ink` on `canvas`, hover `signal`, one per view at most (the top bar or the "+" holds it). `outline`: page actions ("New contact", "Adjust balance", Confirm). `ghost`: icon buttons, Cancel, Skip. `link`: inline text with a drawn underline, for actions inside a section rail; it takes no box size. |
| `Input`, `NativeSelect` | Filled `surface`, square, 44px, 16px text (no iOS zoom). Border appears on hover/focus. |
| `Label`, `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldGroup` | Forms are `FieldGroup` + `Field`: mono label above, control, description or error below. Validation sets `data-invalid` on the field and `aria-invalid` on the control; errors are `role="alert"`. |
| `ToggleGroup` | Square mono chips with a hairline frame; the chosen one is inverted (`bg-ink text-canvas`). Expense/income, periods, filters. A single-select group never empties: the empty value of a second click is dropped. |
| `Badge` | Mono tag with a hairline border: product type, currency, in transit. |
| `Card` | Only for raised surfaces: the auth and consent panels. |
| `Dialog`, `DialogPanel`, `AlertDialog` | Bottom sheet on mobile, centered square panel from `sm`. Overlay `canvas` at 90 %, no blur. `AlertDialog` confirms what runs immediately, like deleting a recurring expense. |
| `Empty` | Empty states, left aligned, hairlines above and below, with an optional action. |
| `Skeleton`, `ListSkeleton` | Loading states shaped like what they replace: `Skeleton` is a bare `surface` block, `ListSkeleton` is hairline rows. |
| `Spinner` | Only inside a pending button, next to its text; the button also gets `disabled`. |
| `Separator` | A lone divider line, where a `border-t` used to be. List rows keep `divide-y` through `rowsClass`. |
| `Toaster` (sonner) | Mounted once in the root route. A successful create confirms with `toast.success(...)`; never for reads. |
| `PageHeader`, `Section`, `Eyebrow`, `FocusLayout` | `shared/ui/page.tsx`: the page h1, the rail sections, the `// 0X` label, and the signed-out layout (two-tone statement + panel). |
| `TransactionRow` | `features/transactions`: description in `ink`, mono metadata (`date / source / category`), the signed amount on the right. Every movement list uses it. |

States: hover changes tone or moves a row title 4px right, never size. Focus is a 1px `signal` outline with a 4px offset (global); the amount field shows focus on its bottom line. Disabled is `opacity-50`.

## Screens

| Route | What it is |
| --- | --- |
| `/sign-in` | Two-tone statement and the sign-in panel. Also the OAuth login page for MCP clients. Language picker inside the panel. |
| `/consent` | OAuth consent: the agent's name, then each permission as a row. Deny is `outline`, Allow is primary. |
| `/onboarding` | Two steps (country / language / timezone, then currencies) in the same layout as sign-in. |
| `/overview` | 01 total balance (display size, primary currency) beside the period block: Week / Month / Year with previous and next, then Spent and Received (summed by `GET /api/transactions/summary`). 02 net worth per currency (assets, card debt, net). 03 accounts, 04 credit cards (rows open the source), 05 to confirm, 06 recent movements, 07 in transit. |
| `/accounts` | One section per bank: bank accounts, products as rows that open their detail, cards nested with `↳`; then cash. Add actions as `link` buttons. |
| `/accounts/$type/$id` | A product, cash wallet or credit card: back link, bank, name, balance (or debt and available credit), "Adjust balance", income / expenses / net for the last 6 or 12 months, and its recent movements. |
| `/transactions` | Filters (type, source, date range) and the movement list. |
| `/transfers` | Transfers with a derived type tag, fee and FX notes, an "in transit" tag, and "Mark received". |
| `/recurring` | "Due now" with an editable amount, Confirm and Skip, then the full schedule. |
| `/contacts` | Search, then people and businesses as sections. |
| `/settings` | Language, currencies, categories, notifications (Web Push, the only permission prompt), session. |

## Motion

Quiet and useful. `--ease-out-expo` (`cubic-bezier(0.16, 1, 0.3, 1)`), 300-600ms, only `transform`, `opacity` and color. Underlines draw left to right; row titles and arrows shift in their direction; dialogs fade and rise. Skeletons pulse. A 3.5 % film grain sits in a fixed, inert layer. `prefers-reduced-motion` stops every transition and animation.

## Language

The app is bilingual (English and Spanish) from the first screen. The catalog is `packages/i18n`, and every visible string comes from it, so a new string missing from `messages/en.json` or `messages/es.json` breaks the type check. Use a hyphen `-` in visible text; no em or en dashes.

Before signing in, the language follows the browser and the Paraglide cookie. After signing in, the user's saved preference wins, and the picker in Settings writes it back through `PATCH /api/settings`.

## Accessibility

- One `h1` per page (the overview's is `sr-only`); section labels are `h2`.
- Every form control has a label. Icon-only buttons and links have an `sr-only` name.
- Amounts include a screen-reader prefix ("Income: ", "Expense: ") so color is never the only signal.
- Decorative markers (`//`, `↳`, `→`, `/`, row indices) are `aria-hidden`.
- Loading regions use `aria-busy`. Errors use `role="alert"`.
- `html` sets `color-scheme: dark`, and `option`/`optgroup` get explicit colors: on Windows the browser paints native dropdown lists with the system theme otherwise.
