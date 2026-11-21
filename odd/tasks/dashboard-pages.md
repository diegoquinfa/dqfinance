# Dashboard pages — content restructure

Objective: make every signed-in page read like the overview: a page title, then the content in numbered sections that pair what belongs together and merge what was split for no reason. Nothing new is invented: every action, filter and figure already exists. Branch `new-distribution`; delivery is the working tree plus a verified build, no push or PR. Runner: pnpm from the repo root.

Continuation: [docs/plans/2026-11-07-dashboard-pages-handoff.md](../../docs/plans/2026-11-07-dashboard-pages-handoff.md) holds the full handoff (state per route, remaining work, harness, gotchas). Read it before resuming.

## Specs

S1. `/transactions`: the filter strip becomes two labeled rows on desktop - search and kind side by side, then source, from and to - and the day-grouped list keeps the full width. No section rail here: a single ledger's label would repeat the h1. Filters stay in the URL, the mobile sheet and chips stay as they are, and day headings stay `h2`.
S2. `/transactions/import`: the source picker folds into `01 Statement` (source, pasted rows, file, assistant note). `02 Columns` and `03 Preview` keep their numbers; the Import action stays in the preview rail.
S3. `/accounts`: the per-bank sections collapse into one `01 Accounts` block, each bank as an `h3` with its "Add account" action beside it; `02 Cash` lists the wallets. Every add action stays reachable.
S4. `/accounts/$type/$id`: the header is the summary band and keeps the pocket's two transfer buttons in its action row; `01 Stats` puts the period totals in 5 of 12 columns beside the balance chart in 7; `02 Returns and costs` puts the rate figures in 5 beside the cost list in 7, with its Add cost action under the subheading; `03 Movements` and `04 Documents` stay full width.
S5. `/recurring`: `01 Due now` stays full width; `02 Schedule and incomes` puts the schedule in 7 columns beside the incomes in 5, each under a mono subheading with its monthly total, and the new-income action beside the incomes subheading. Delete stays on every row.
S6. `/calendar`: `01 Month` keeps the month figures as its lede with the grid below; `02 Day` splits into the day's due recurring expenses (5) and its movements (7), each with a mono subheading and the View all action beside the due heading.
S7. `/savings`: the goal rows move into one `01 Goals` section; the New goal action stays in the page header.
S8. `/incomes`: the rows move into one `01 Expected incomes` section; the New income action stays in the page header.
S9. `/budgets`: the rows move into one `01 Limits` section; the New limit action stays in the page header.
S10. `/contacts`: `01 Compare` keeps its period toggle in the rail; the list becomes `02 Contacts` with the same rows, kind toggle and search.
S11. `/contacts/$id`: `01 Breakdown` pairs the categories (5) with the monthly chart (7), and the 6M/12M period moves into that section's rail; `02 Movements` closes the page full width with View all.
S12. `/transfers`: the rows move into one `01 Transfers` section; the New transfer action stays in the page header.
S13. `/settings`: `01 Account settings` pairs preferences (language, timezone) in 5 columns with currencies in 7, each under a mono subheading; `02 Categories`, `03 Notifications`, `04 Password`, `05 Webhooks`, `06 Session` follow, renumbered with no gap. Every action keeps working.
S14. Every page keeps its existing permission checks, queries, URL state and empty/error states. New user-facing strings exist in both catalogs; no new colors, radii, shadows or raw values. `docs/screens.md` matches each restructured route.
S15. Verification: `pnpm check-types`, `pnpm test`, `pnpm build` pass; every restructured page is rendered in the local harness and read with agent-browser at 1440, 1280, 1024 and 390 (no horizontal overflow); axe wcag2a/2aa reports 0 violations on each; heading order stays h1 > h2 > h3.

## Tasks

| ID | Spec | Route | State |
| --- | --- | --- | --- |
| T1 | S1 | inline | done |
| T2 | S2 | inline | done |
| T3 | S3 | inline | done |
| T4 | S4 | inline | done |
| T5 | S5 | inline | done |
| T6 | S6 | inline | done |
| T7 | S7 | inline | done |
| T8 | S8 | inline | done |
| T9 | S9 | inline | done |
| T10 | S10 | inline | done |
| T11 | S11 | inline | done |
| T12 | S12 | inline | done |
| T13 | S13 | inline | done |
| T14 | S14, S15 | parent | done |

## Validation

`wrangler dev` and the built Worker both need workerd, which aborts on this machine (`CreateDirectory: #5 Acceso denegado; path = miniflare-email-store`; reproduced with a fresh `TEMP`). Pages are rendered by the local harness (`apps/web/mock/`, gitignored): `?page=<name>` renders the real page against stubbed `/api/*` payloads, with the real shell. Always read the screenshot with **agent-browser**.

```pwsh
pnpm --filter @dqfinance/web exec vite --config mock.vite.config.ts   # http://localhost:3200/mock/?page=transactions
agent-browser --session dq-pages open "http://localhost:3200/mock/?page=transactions"
agent-browser --session dq-pages set viewport 1440 900
agent-browser --session dq-pages screenshot --full C:/Temp/shots/transactions.png
```

Checks that stay in the loop:
- Overflow: `document.documentElement.scrollWidth - innerWidth` at 1440, 1280, 1024 and 390.
- `agent-browser a11y --tags wcag2a,wcag2aa` per page, expanded and collapsed rail.
- Heading order: `[...document.querySelectorAll('h1,h2,h3')].map(h => h.tagName + ' ' + h.textContent)`.

## Log

L1 (user, verbatim): "Reestructurar todos las paginas del dashboard actual, si hace falta juntar contenido se hace. Siempre validar ui, diseño, accesibilidad y que sea facil de entender."

L2: page inventory delegated to a read-only subagent over all 13 signed-in page files; its per-page proposals are the base of S1-S13. The overview restructure from `odd/tasks/dashboard-distribution.md` is the reference, not a template.

L3: the harness now switches pages with `?page=` and stubs its queries; the mock router gained `useSearch`/`useNavigate`/`useParams`/`useRouterState` so real pages render without a router.

L4: `/transactions` was first wrapped in a `01 Movements` Section. Rendered, it repeated the h1 and narrowed the ledger into the 9-column rail while the filters stayed full width, so it was reverted: the page keeps the full-width list and the change lands in the filter band (kind gets its visible label, search and kind share the first row). The rail is for pages with blocks, not for a single ledger.

L5: `/accounts` merged from one Section per bank to `01 By bank` with one `h3` per bank plus its Add action, and `02 Cash` (or `01` when there are no banks). S3 shipped with a mobile fix: the amount column in `SourceLine` goes full width under the name at phone sizes so long names no longer break into three lines.

L6 (evidence): `/transactions` and `/accounts` rendered in the harness at 1440/1280/1024/390 with no horizontal overflow; axe wcag2a/2aa 0 violations on both; heading order on `/accounts` is h1 Cuentas > h2 By bank > h3 Bancolombia/Nu/Wise > h2 Cash.

L7: `pnpm test` failed intermittently on `celebrated-backfill.test.ts` ("the migration marks the goals already reached as celebrated"). Root cause: the migration stamps with SQLite's own clock (`cast(unixepoch('subsecond') * 1000 as integer)`), which sits a millisecond or two either side of Node's `Date.now()`; the test compared against both bounds exactly. Measured deltas were -1..+1ms in isolation and larger under the parallel suite. The assertion now allows a 100ms margin on both bounds, still proving the stamp came from this migration; three consecutive API runs passed.

L8: `/recurring` merged its two lists into `02 Monthly plan`: schedule in 7 columns, incomes in 5, each under a mono subheading with its monthly total; the new-income action sits beside the incomes subheading. When a row wraps, the amount block now pushes itself right (`ml-auto`) instead of falling back to the left edge.

L9: `/calendar` day 02 pairs due (5) and movements (7) only when both have rows; when one side is empty the other takes the full width, so no empty column is invented. The due row was restacked (name and badge, amount, then the mono meta) because at 5 columns the two-column row truncated the name to "Arrie…".

L10: `/budgets` wraps its list in `01 Monthly limits`, the first rail label that does not repeat the h1.

L11 (evidence, round 2): `/recurring`, `/calendar` and `/budgets` rendered at 1440/1280/1024/390 with no horizontal overflow; axe wcag2a/2aa 0 violations on each; heading order h1 > h2 section > h3 subheading verified on `/recurring` and `/calendar`; the empty day shows "No hay nada en este día" and the calendar day section falls back to one column.

L12: `/savings`, `/incomes` and `/transfers` each wrapped their single list in one section whose label does not repeat the h1: `01 Goals`, `01 Incomes`, `01 All transfers`. The transfer rows still fit the 9-column content at 1440 (headlines, tags, amount, Mark received and Delete on one row), so the rail does not cost legibility there.

L13 (evidence, round 3): the three pages rendered at 1440/1280/1024/390 with 0 overflow and axe 0 violations; `docs/screens.md` rows updated for `/savings`, `/incomes`, `/transfers`, `/recurring`, `/calendar` and `/budgets`.

L14: the 100ms tolerance edit left the previous 1ms assertion in the file, so the flake kept failing (and the failure line looked like the new one). Removed the stale assertion; three API runs and the full suite pass. Lesson: re-read the whole assertion block after editing a test, not just the line.

L15: `/contacts` gained `02 All contacts` (label chosen so it does not repeat the h1) and a visible "Type" label on the kind toggle; the search field widened to two of four columns. `/contacts/$id` merged categories + evolution into `01 Breakdown` (5/7) with the 6M/12M toggle in its rail, and movements became `02`. The chart's Y axis was clipping its leading digit at the narrower width; `YAxis width` went from 56 to 64 so "150 mil" reads whole. The compare charts are separate components and were not touched.

L16 (evidence, round 4): both contact pages rendered at 1440/1280/1024/390 with 0 overflow and axe 0 violations; headings `h1 Contactos > h2 Comparar / Todos los contactos` and `h1 Carrefour > h2 Desglose / Movimientos`.

L17: `/settings` merged Preferences and Currencies into `01 Account settings` (5/7, with mono subheadings), renumbered Categories to 02, Push to 03, Password to 04, Webhooks to 05 and Session to 06. The label reuses the existing `settings_account` string ("Cuenta"); a first attempt added a second key with the same name and the catalogs had duplicate keys, which the JSON parser silently collapsed — the duplicate was removed and a key scan now reports none.

L18: `/transactions/import` merged the source picker into `01 Statement`; Columns is `02` and Preview is `03` (or `02` when there are no headers), with Import in the preview rail. Rendered with a real pasted CSV through the harness: the preview shows one duplicate row marked and left out, and the button reads "Import 1 movements".

L19 (evidence, round 5): `/settings` at 1440/1280/1024/390 and `/transactions/import` at 1440 with 0 overflow and axe 0 violations; headings `h1 Ajustes > h2 Cuenta / Categorías / Notificaciones / Contraseña / Webhooks / Sesión` and `h1 Importar extracto > h2 Extracto / Columnas / Vista previa`.

L20: session handed off for context budget after round 5. Remaining: T4 (`/accounts/$type/$id`, S4) and T14 (final sweep). The handoff document is `docs/plans/2026-11-07-dashboard-pages-handoff.md`; it carries the per-route state, the exact S4 steps, the harness `?page=` list and the gotchas. The active goal was closed with the session; a new session should re-create it from the objective.

L21: `/accounts/$type/$id` restructured (S4, T4). The header stays the summary band and absorbed the pocket's two transfer buttons, so "Move money" is gone as a section; `01 Stats` pairs the period totals in 5 of 12 columns with the balance chart in 7 and the 6M/12M toggle stays in the rail; `02 Returns and costs` pairs the rate figures in 5 with the cost list in 7 under mono subheadings, with "Add cost" beside the costs subheading; `03 Movements` (View all in the rail) and `04 Documents` close the page full width. Numbering is now fixed at 01-04, so a source with no rate (a plain account or a card) shows `02 Costos` alone, full width.

L22: two layout fixes the render forced. `PeriodTotals` gained a `stacked` flag: three totals side by side at 5 of 12 columns ran into each other (amounts overlapping the next label), so on this page each figure takes its own row, label left and amount right; the chart's own 3M/12M range control is untouched and still differs from the rail's 6M/12M on purpose (totals period vs chart range). The header action row widens to 5 of 12 and two columns of buttons when the source has a parent: four buttons in the 4-column row wrapped into three ragged lines, and a 2+2 grid right-aligns them (`Ajustar saldo`/`Editar producto`, `Separar más`/`Devolver a {parent}`); below `lg` the buttons stack full width. `SourceCosts` stopped drawing its own `Section` (it takes `heading`), so it can share section 02; strings: `source_returns_costs` added to both catalogs, `source_move_money` removed with the block that used it.

L23 (evidence, round 6): harness grew `?page=source|source-rate|source-pocket|source-card` (p1 costs only, p2 yield + a cost, p4 pocket, k1 card), a `/api/documents` stub, `parentProductId` on p4 and one cost on p2. Rendered all four variants at 1440/1280/1024/390 with 0 horizontal overflow and axe wcag2a/2aa 0 violations; heading order `h1 Cuenta de noche > h2 Ingresos y gastos > h2 Costos > h2 Movimientos recientes > h2 Documentos`, and the pocket shows `h2 Rendimiento y costos > h3 Rendimiento / Costos`. Both pocket dialogs open prefilled (`Desde Vacaciones` for "Devolver a Cuenta de ahorro"). Sweep over all 17 page variants: overflow 0 at 1440/1280/1024/390, axe 0 at 1440, heading order valid; `pnpm check-types`, `pnpm test`, `pnpm build` pass. `docs/screens.md` updated for `/accounts/$type/$id`.
