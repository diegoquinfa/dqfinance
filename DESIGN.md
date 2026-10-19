# DQFinance — Design

The UI borrows the editorial language of [diegoquinfa.dev](https://diegoquinfa.dev): a dark studio where numbers and type coexist. Hierarchy comes from **scale and tone**, not color: a balance can take half the screen while its metadata barely whispers below it. Lots of empty space, near-monochrome, one lilac signal, square corners, hairlines between rows. No glass, glow, gradients in text, or decorative shadows.

People open the app to answer "where did my money go?" and "did I record that?". Every screen answers those fast. Nothing competes with the numbers.

Tokens live in `apps/web/src/styles.css`. This file explains them. When the two disagree, fix whichever one is wrong in the same change.

## Logo

The mark is a **dq ligature**: `d` and `q` are mirror images (a bowl on the left, a stem on the right), so they share one square bowl and one stem that rises (the `d`) and drops (the `q`), like money in and out of a ledger column. The descender is the one `signal` touch; the rest is `ink`. In the lockup the ligature stands in for "dq" and "FINANCE" follows in Geist Mono Medium, uppercase, tracked 0.16em like `label-mono`, in `muted-foreground`, with its cap height on the bowl's x-height: the mark speaks in scale, the name in the app's technical voice.

| File (`apps/web/public/`) | Use |
| --- | --- |
| `logo.svg` | Lockup, tight bounds, transparent. Top bar and the signed-out layout (`h-7`); on `/sign-in` it sits inline in the panel title instead ("Sign in to [logo]"). |
| `logo-mark.svg` | The ligature alone on `canvas`, 512 px. Avatars, social, store icons. |
| `favicon.svg` | The mark at 32 px with a heavier stroke so the counter survives at 16 px. |
| `apple-touch-icon.png`, `icon-512.png` | Raster exports of `logo-mark.svg`. |

Rules: square corners, never rounded or outlined; only on `canvas` or `raised` (on `paper` use the mark with its own `canvas` square); never recolor the descender or tint the bowl; keep clear space of one bowl width around it. The wordmark is outlined paths from Geist Mono Medium (no font dependency); a sans "finance" read as generic next to the constructed mark. The stem is symmetric: it rises above the x-height as far as it drops below the baseline.

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
- **Card faces are the only exception**, and the only non-token colors in the app. The API stores a color name (`ink`, `signal`, `sand`, `moss`, `clay`, `ocean`) and `features/accounts/card-face.tsx` maps it once to a fixed dark palette. Nothing else takes a raw color.

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

- **Top bar** (64px, `canvas` + hairline, sticky): `DQFINANCE` in mono on the left. From `xl`, the seven mono links with a drawn underline (`link-draw`) and `ink` for the current page. From `lg`, the primary "New movement" button. From `xl`, the account is a square avatar (the user's initials) opening a dropdown with the name and email (mono), Settings and Sign out. Below `xl`, "Menu" opens a full-screen menu with large numbered links (`01`... in `faint`, the current one in `signal`), the name, the email, and "Sign out".
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
| `Avatar`, `DropdownMenu` | The account: a square avatar with initials (mono), its dropdown names the user and offers Settings and Sign out. |
| `Skeleton`, `ListSkeleton` | Loading states shaped like what they replace: `Skeleton` is a bare `surface` block, `ListSkeleton` is hairline rows. |
| `Spinner` | Only inside a pending button, next to its text; the button also gets `disabled`. |
| `Separator` | A lone divider line, where a `border-t` used to be. List rows keep `divide-y` through `rowsClass`. |
| `Toaster` (sonner) | Mounted once in the root route. A successful create confirms with `toast.success(...)`; never for reads. |
| `PageHeader`, `Section`, `Eyebrow`, `FocusLayout` | `shared/ui/page.tsx`: the page h1, the rail sections, the `// 0X` label, and the signed-out layout (two-tone statement + panel). |
| `TransactionRow` | `features/transactions`: description in `ink`, mono metadata (`date / source / category`), the signed amount on the right. Every movement list uses it. |
| `Chart` | `shared/ui/chart.tsx` wraps Recharts (the only chart dependency). Lines only: assets solid in `ink`, liabilities dashed in `muted-foreground`, so the dash tells them apart without relying on tone. A mono legend beside the title, a `line` grid, mono ticks with compact amounts on the Y axis (`150 mil`), a `line-strong` cursor, no area fills, no lilac, no animation. The tooltip is a square hairline panel with the month, then each series label beside its `formatMoney` value; the region carries an `aria-label` and the same points sit in an `sr-only` table beside it. |
| `Table` | Data with more than two columns, like the statement import preview: mono headers, hairline rows, no box, no zebra. |
| `Textarea` | Pasted statement rows: filled `surface`, mono, grows with what it holds. |
| `CardFace` | `features/accounts/card-face.tsx`: the 1.586 square-cornered face on a product's card page, with its color, brand (`label-mono`) and masked last 4. |

States: hover changes tone or moves a row title 4px right, never size. Focus is a 1px `signal` outline with a 4px offset (global); the amount field shows focus on its bottom line. Disabled is `opacity-50`.

## Screens

| Route | What it is |
| --- | --- |
| `/sign-in` | Two-tone statement and the sign-in panel. Also the OAuth login page for MCP clients. Language picker inside the panel. |
| `/consent` | OAuth consent: the agent's name, then each permission as a row. Deny is `outline`, Allow is primary. |
| `/onboarding` | Two steps (country / language / timezone, then currencies) in the same layout as sign-in. |
| `/overview` | 01 total balance (display size, primary currency) beside the period block: Week / Month / Year with previous and next, then Spent and Received (summed by `GET /api/transactions/summary`). 02 net worth per currency (assets, card debt, net), then the month-end assets and liabilities chart with 3M / 12M. 03 accounts, 04 credit cards (rows open the source), 05 to confirm, 06 recent movements, 07 in transit. |
| `/accounts` | One section per bank: bank accounts, products as rows that open their detail, cards nested with `↳`; then cash. Add actions as `link` buttons. On mobile the add actions open the pages below; from `lg` the dialogs stay next to them. |
| `/accounts/new` | The full-page create form: back link, title, and Create at the top and at the end. The opening balance is the large first field with the currency beside it, then bank (existing or new), bank account (existing or new, last 4 optional), product name, type and annual rate. The opening balance is recorded as an adjustment dated today (D2), then the new product's detail opens. |
| `/accounts/new-card` | The card as a page: the live card face at the top, then kind, product, name, last 4, brand, interest rate with MV / EA, color and the credit details. A credit card opens its own detail, a debit card its product. |
| `/accounts/$type/$id` | A product, cash wallet or credit card: back link, bank, name, balance (or debt and available credit), a credit card's face, "Adjust balance", edit, income / expenses / net for the last 6 or 12 months with the same chart for that source, a product's yield (rate, "≈ per month" and "≈ per day"), its costs (the recurring expenses paid with it, with "Add cost"), its recent movements with "View all", and its documents (contract, terms, fee table) with upload, download and delete. |
| `/transactions` | Filters (type, source, date range) and the movement list. The filters live in the URL, so a link can preselect a source. "Import" opens the statement import. |
| `/transactions/import` | A CSV statement: source, the pasted rows or a chosen .csv file, the column map, then the dry-run preview as a table, duplicates marked and left out, and "Import N movements". PDFs and screenshots are imported by asking the AI assistant. |
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
