# DQFinance — Design

The UI should feel like a well-kept ledger: calm, exact, and quick to read. People open it to answer two questions: "where did my money go?" and "did I record that?". Every screen answers those fast. Nothing competes with the numbers.

Tokens live in `apps/web/src/styles.css`. This file explains them. When the two disagree, fix whichever one is wrong in the same change.

## Principles for financial tracking

1. **Numbers first.** Amounts are the largest, highest-contrast element in a row. Use `tabular-nums` everywhere digits stack, so columns line up and changes are easy to scan.
2. **Expenses are normal, not alarming.** An expense uses the regular foreground color with a `−` (U+2212). Income gets the `income` green and a `+`. Red (`destructive`) is reserved for errors and, later, overspending. If every coffee turns red, the color stops meaning anything.
3. **Never hide or invent precision.** Show cents when they exist (`$ 45.000,50`) and drop them when the amount is whole (`$ 3.200.000`). Never round a stored value for display. Formatting follows the user's locale through `Intl`.
4. **Recording must take under 10 seconds.** Smart defaults (type = expense, date = today, currency = COP), the amount field first, and the keyboard's Enter submits. The form resets on success and keeps the chosen type.
5. **Say who is acting.** The consent screen names the agent and lists permissions in plain language ("Record new transactions"), never raw scopes.
6. **Honest states.** Every data view has a skeleton loader shaped like its final layout, an empty state that explains how to start (including "ask your AI assistant"), and an inline error that says what to do next.
7. **Foreign-currency charges show both numbers.** A credit-card charge in another currency shows what the card owes (its value in the card's currency) as the amount, with the original charge as a small badge: `$5` → `−COP 20.000`. The card balance and the reports stay in the card's currency.
8. **The UI speaks the user's language.** Every string comes from `packages/i18n`; there are no literals. Numbers, dates and currency names follow the same locale.

## Color

Neutrals are **zinc** (cool gray, hue 286). There is one accent, **cobalt** (hue 262), which reads as trust without the "AI purple" look. Green and red are semantic, not decorative.

| Token | Role | Light | Dark |
| --- | --- | --- | --- |
| `background` | Page | `#fafafb` | `#0d0d0f` |
| `foreground` | Text, expense amounts | `#18181b` | `#f1f1f3` |
| `card` | Raised surfaces (forms, dialogs) | `#ffffff` | `#161618` |
| `primary` | Main action, focus ring, links | `#285cc2` | `#6496f4` |
| `muted` | Segmented controls, skeletons | `#f0f0f2` | `#242427` |
| `muted-foreground` | Secondary text (dates, hints) | `#62626b` | `#a0a1a9` |
| `border` | Dividers, card edges | `#e1e1e4` | `#28282c` |
| `input` | Input borders | `#d4d4d7` | `#37373b` |
| `income` | Income amounts | `#067d4d` | `#4dc588` |
| `destructive` | Errors only | `#cc2827` | `#f75d59` |

Rules:

- Use one accent per screen. Never introduce a second brand color. Charts, when they arrive, use tints of cobalt plus the semantic pair.
- Every pair passes WCAG AA (4.5:1) for its use. Check contrast before adding a token or a new pairing.
- Write colors through Tailwind tokens (`text-income`, `bg-card`), never raw hex in components.

## Typography

- **Family:** Geist Variable, self-hosted via `@fontsource-variable/geist` (no Google Fonts link). It is a neutral, modern grotesk with excellent tabular figures.
- **Numbers:** add `tabular-nums` to every amount, total, and numeric input.
- **Scale:** keep it small and consistent.

| Use | Class |
| --- | --- |
| Page title | `text-2xl font-semibold tracking-tight` |
| Section / card title | `font-semibold` (16px) or `text-xl` on auth cards |
| Body, row titles | `text-base`, `font-medium` for row titles |
| Secondary (dates, hints, labels) | `text-sm` + `text-muted-foreground` |

- Use sentence case everywhere. Do not use uppercase "eyebrow" labels.
- Emphasize with weight (500 → 600) in the same family. Never add a second typeface.

## Spacing and layout

- 4px base grid (Tailwind default). Common steps: `gap-2` inside a field (label → input), `gap-4` between fields, `gap-8` between page regions, `py-3` per list row.
- Content width: `max-w-5xl`, centered, `px-4`. The header is `h-14` with a bottom border.
- **Ledger layout:** on `lg` and up, the list sits in the main column and the entry form in a `20rem` side panel (`lg:grid-cols-[1fr_20rem]`, sticky). Below `lg`, the regions stack: list first, then the form.
- Group rows with `divide-y`, not with one card per row. Use cards only for surfaces that are actually raised (forms, auth, dialogs).
- Corner radius: one scale, `--radius: 0.5rem`. Inputs and buttons use `rounded-md`, cards use `rounded-lg`. Pills (full radius) are not used.

## Base components

shadcn/ui ("new-york" style) is generated into `apps/web/src/shared/ui`. Add more with `pnpm dlx shadcn@latest add <name>` from `apps/web`. Customize by editing tokens first and component classes second.

| Component | Notes |
| --- | --- |
| `Button` | `default` (primary) for the one main action, `outline` for the alternative (Deny), `ghost` in the header and per-row actions. Labels are 1–2 words and say what happens ("Add expense", "Save movement"). |
| `Input` + `Label` | Label above the field, never placeholder-as-label. Errors appear below in `text-destructive` with `role="alert"`. |
| `Field` (`shared/ui/field.tsx`) | Label above, control, then hint **or** error below. Every form control is wrapped in one. Also exports `FormError`, `ListSkeleton` and `EmptyState`. |
| `Segmented` | Radio group styled on `muted`, for either-or choices (expense/income, person/business, filters). |
| `NativeSelect` | Short fixed lists (currency, source, category, frequency). The platform picker beats a custom listbox here, including on mobile. |
| Native dropdown rows | The browser paints the open list itself, and on Windows it uses the **system** theme, which can contradict the page (light list, white text). `styles.css` sets `color-scheme` per theme and gives `option`/`optgroup` an explicit background and text color. Do not remove those rules, and do not expect to style the list with Tailwind classes. |
| `DialogPanel` | Dialog with a trigger and a `children(close)` function, so a form closes itself after saving. Content unmounts on close, which resets form state. |
| `Card` | Auth, consent, and each block of the overview. |
| `Badge` | Types, currencies, transfer types, in transit, and the original charge of a foreign transaction. |

States: hover changes background, not size. Focus is always visible (`ring-[3px] ring-ring/50`). Disabled is `opacity-50`. Pending buttons change their label ("Signing in…").

## Screens

| Route | What it is |
| --- | --- |
| `/sign-in` | Sign in or create an account. Also the OAuth login page for MCP clients, where a note explains that an app is asking for access. Language picker at the bottom. |
| `/consent` | OAuth consent: the agent's name, then each permission in plain language. Deny is `outline`, Allow is primary. |
| `/onboarding` | Two steps: country / language / timezone, then the currencies. Finishing creates the default categories and a cash wallet, then goes to Accounts. |
| `/overview` | Balances per source, credit-card total with debt per currency and available credit, in transit, the "to confirm" inbox, and the 10 latest movements. Each block links to the section that owns it. |
| `/transactions` | Filters (type, source, date range) plus the movement list; the entry form lives in a dialog. |
| `/transfers` | Transfers with a derived type badge, fee and FX notes, an "in transit" badge, and "Mark received". |
| `/accounts` | The tree: bank → account → product → cards, then cash. Create dialogs at each level, and "Adjust balance" wherever a balance exists. |
| `/contacts` | People and businesses, with search and a create dialog. |
| `/recurring` | "Due now" with an editable amount, Confirm and Skip, then the full schedule. |
| `/settings` | Language, currencies, categories, and sign out. |

## Language

The app is bilingual (English and Spanish) from the first screen. The catalog is `packages/i18n`, and every visible string comes from it, so a new string that is not in `messages/en.json` and `messages/es.json` breaks the type check.

Before signing in, the language follows the browser and the Paraglide cookie. After signing in, the user's saved preference wins, and the picker in Settings writes it back through `PATCH /api/settings`.

## Dark mode

Dark mode is supported and **follows the OS setting** (`prefers-color-scheme`). The Tailwind `dark:` variant is bound to the media query, so there is no flash and no JS. Dark surfaces step up in lightness (background → card → muted) instead of using shadows. The accent and income colors are lightened to keep contrast. A manual toggle is not implemented. If one is added, switch `@custom-variant dark` to a class strategy and set the class before first paint.

## Accessibility

- Every form control has a label. Icon-only buttons need `aria-label`.
- Amounts include a screen-reader prefix ("Income: ", "Expense: ") so color is never the only signal.
- Loading regions use `aria-busy`. Errors use `role="alert"`.
- Respect `prefers-reduced-motion` for any future animation. Today the only motion is the skeleton pulse.
