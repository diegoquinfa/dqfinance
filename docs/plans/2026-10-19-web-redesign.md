# Web redesign: the diegoquinfa.dev editorial style

Goal: the web app takes the visual language of diegoquinfa.dev (dark editorial, scale and tone over color, Geist Sans + Geist Mono, one lilac signal, square corners, hairline rows) and a mobile-first structure taken from finance apps (a balance hero, period totals, net worth, accounts with a detail page, a bottom bar with a "new movement" action). Adapted, not copied.

## Decisions

- **Dark only.** The portfolio has no light mode. `prefers-color-scheme` handling goes away.
- **Tokens keep the shadcn names** (`background`, `card`, `muted`, `primary`...) so every primitive keeps working, with the portfolio values. New names for what shadcn lacks: `ink`, `soft`, `faint`, `raised`, `surface`, `line`, `line-strong`, `signal` (lilac; shadcn's `accent` is a hover background).
- **Primary action** is `ink` on `canvas`, hover to `signal`. Lilac never fills a resting button.
- **Two weights** (400/500), no bold. Mono voice (`label-mono`) for labels, eyebrows, dates and metadata.
- **No radius** anywhere. No shadows. Lists are hairline rows, not cards. Cards remain only for raised surfaces (auth, consent).
- **Income stays green** (semantic, the ledger needs it). Expenses stay `ink` with `−`.
- **Multi-currency:** no FX rates exist, so totals are per currency. The hero shows the primary currency large and any other currency as a small line under it.

## Structure

1. **Shell:** top bar 56px (mono brand, desktop mono links with the active one in `ink`, menu button on mobile opening a full-screen numbered menu). Mobile bottom bar: Overview, Movements, Accounts, Recurring + a square "new movement" button. Content in `container-page` (max 1360px).
2. **Overview** (rail layout on desktop: mono label in 3 columns, content in 9):
   - Hero: total balance in the primary currency (display size), other currencies below.
   - Period: Week / Month / Year segmented control with previous/next, then Spent and Received.
   - Net worth: assets, liabilities (card debt), net.
   - Accounts (each row opens its detail), credit cards, in transit, to confirm, recent movements.
3. **Source detail** (`/accounts/$type/$id`, new): breadcrumb, bank, big balance, adjust balance, last 6 / 12 months income, expense and net, recent movements of that source.
4. **Accounts, transactions, transfers, contacts, recurring, settings, auth, onboarding:** restyled through the primitives plus page headers; accounts rows link to the detail page.
5. **Forms:** mono labels, square filled inputs, the movement amount as a large first field.

## Follow-ups

Shipped on `main` in `feat/follow-ups`. Each item says what it needed; the commit that shipped it is noted.

1. **Assets and liabilities chart (3M / 12M) on the overview.** The reference shows a line per month. Needs an API that returns month-end balances per currency: `compute-balances.ts` already folds every movement, so add a pure `balancesAt(date)` (or a fold that emits a point per month) in `features/balances/`, a route `GET /api/balances/history?months=`, and a small SVG line chart (no chart library; two series, `ink` for assets and `muted-foreground` for liabilities, never lilac fills). Same chart on the source detail page, filtered by source. — done: `4b42d1e` (chart, recharts), `de0da03` (history API).
2. **Yield per account.** The reference shows the annual effective rate and what it earns per month and per day. Needs a nullable `annual_rate_bps` on `product` (migration + create/edit dialogs + MCP), and a pure estimate `balance × rate` shown as "≈" (an estimate, never a balance: the real interest arrives as income or an adjustment, design D2). — done: `4b42d1e` (web), `de0da03` (API).
3. **Card details on create.** The reference's card form has brand, linked account, interest rate (MV / EA), statement and payment days, costs, and a color. Today the card has kind, name, last 4, limit, statement and payment days. Brand, rate and fees need model fields first; the color is presentation only. — done: `4b42d1e` (web), `de0da03` (API).
4. **Account costs (fees).** "Costos" per account or card (monthly fee, handling fee). Model it as recurring expenses linked to the source rather than a new table, if the recurring feature can carry a source-level flag. — done: `54a6c5e`.
5. **Documents per account.** Contract, terms, fee table. Needs R2 storage, an upload route, and ownership checks; out of scope until there is a deploy. — done: `71f53d3` (API, R2), `68c45d3` (web).
6. **Statement import.** "Extractos y movimientos" from PDF, screenshots or video. Large: parsing (AI through the MCP or an API model), a review step before writing, and duplicate detection. — done: `71f53d3` (API), `68c45d3` (web CSV page). PDF, screenshots and video stay out; the shipped path is CSV.
7. **Full-page create forms on mobile.** New account and new card as pages (header with back and "Save") instead of bottom sheets, with the opening balance as the large first field like the movement form. — done: `e4fe794`.
8. **"View all" from a source.** The source detail lists the last 20 movements; a link to `/transactions?source=` needs the transactions filters moved from local state to route search params. — done: `54a6c5e`.
9. **Summary as an MCP tool.** `GET /api/transactions/summary` exists for the web only; agents still page through `list_transactions` to total a period. Add `summarize_transactions` in `transactions.tools.ts`. — done: `f492e3b`.
10. **Profile switcher.** The reference header shows the user's photo and a "Personal" profile picker. Only meaningful once there are shared or business ledgers. — done: `54a6c5e` (the menu only; see Still open).
11. **Push for transfers and adjustments.** Web Push refreshes open pages on income and expense only; transfers, adjustments and recurring edits made by an agent still need a reload. — done: `f492e3b`, plus import pushes in `71f53d3`.

### Still open

Honest limits the workers reported; none blocks the shipped work.

- **Multi-ledger profiles.** Only the profile menu was built (#10). Shared or business ledgers are a domain decision, not a UI one.
- **Statement import has no foreign-currency card rows.** Each row uses its source's currency; a card charge in another currency is not representable.
- **History and duplicate days are UTC.** `GET /api/balances/history` month ends and import duplicate detection do not use the user's timezone.
- **Documents have no MCP upload or download.** Agents can only `list_documents`; the binary stays in the web app.
- **The bank-fees category is matched by its localized name on the web.** `list_categories` exposes no `systemKey`, so the match depends on the catalog. — done: `list_categories` returns `systemKey` and the web matches `bank_fees` by key.
- **Chart animation is off unconditionally.** No reduced-motion check; the chart simply does not animate.

## Steps

1. Tokens, fonts (`@fontsource-variable/geist-mono`), utilities, primitives (button, input, select, segmented, card, badge, dialog, label, field).
2. Shell: top bar, mobile menu, bottom bar, global new-movement action.
3. Shared pieces: `PageHeader`, `Section`, `TransactionRow`, period math (`shared/periods.ts` + test).
4. Overview rebuild.
5. Source detail page + links from overview and accounts.
6. Remaining pages: headers, rows, font weights.
7. i18n keys (en + es), DESIGN.md rewrite.
8. `pnpm check-types && pnpm test && pnpm build`, then a browser pass at 390px and 1440px.
