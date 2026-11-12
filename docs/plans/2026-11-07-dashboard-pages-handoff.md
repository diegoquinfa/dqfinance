# Handoff — dashboard pages restructure

Written 2026-11-07 after five rounds. Everything below is in the working tree of
`C:\Users\diego\.herdr\worktrees\dqfinance\new-distribution` (branch `new-distribution`, based on
`d4c2941`). Nothing is committed: the repository rule is no commits unless the user asks.

## Objective (verbatim)

"Reestructurar todos las paginas del dashboard actual, si hace falta juntar contenido se hace.
Siempre validar ui, diseño, accesibilidad y que sea facil de entender."

The plan, specs and evidence log live in [odd/tasks/dashboard-pages.md](../../odd/tasks/dashboard-pages.md)
(S1-S15, T1-T14, L1-L19). Read it first; it is the source of truth for what each route should look like.

## State

13 of the 13 signed-in pages are restructured and verified. The remaining work below was finished in
the session that followed this handoff (see L21-L23 in the task document); this file stays as the record
of what it took.

| Route | What changed | State |
| --- | --- | --- |
| `/overview` | Already done in the previous feature (`dashboard-distribution`): summary band + paired sections; band now uses a container query at 64rem | done |
| `/transactions` | Filter band in two labeled rows (search + kind, then source/dates); list stays full width, no rail | done |
| `/transactions/import` | Source folded into `01 Statement`; `02 Columns`; `03 Preview` (or `02` without headers) with Import in the rail | done |
| `/accounts` | One `01 By bank` section with an `h3` per bank + its Add link; `02 Cash` (or `01` without banks) | done |
| `/recurring` | `01 Due now`; `02 Monthly plan`: schedule 7 / incomes 5, mono subheadings, monthly totals | done |
| `/calendar` | `02 Day` pairs due (5) / movements (7) only when both have rows; otherwise one column | done |
| `/savings` | Single list in `01 Goals` | done |
| `/incomes` | Single list in `01 Incomes` | done |
| `/budgets` | Single list in `01 Monthly limits` | done |
| `/contacts` | `01 Compare` + `02 All contacts`; visible "Type" label; search 2/4 columns | done |
| `/contacts/$id` | `01 Breakdown` pairs categories (5) / monthly chart (7), period toggle in its rail; `02 Movements` | done |
| `/settings` | `01 Account settings` pairs Preferences (5) / Currencies (7); Categories 02, Push 03, Password 04, Webhooks 05, Session 06 | done |
| `/accounts/$type/$id` | Header band keeps the pocket's transfer buttons; `01 Stats` 5/7 with the toggle in the rail; `02 Returns and costs` 5/7 under mono subheadings; `03`/`04` full width | done |

## Remaining work

### 1. `/accounts/$type/$id` (spec S4, task T4) — done

File: `apps/web/src/features/balances/source-page.tsx` (282 lines). Current order: header (name, balance,
card face, actions) → `01 Stats` (period totals + chart) → `02 Move money` (pocket only) → `03 Yield` →
`04 Costs` → `05 Movements` → `06 Documents`, numbered by `sectionKeys`/`sectionIndex`.

Target:

- The header stays the summary band. Move the pocket's two transfer buttons ("Set aside more", "Return to
  {parent}") into its action row, so `Move money` stops being its own section.
- `01 Stats`: period totals in 5 of 12 columns beside `BalanceChart` in 7 (period toggle stays in the rail).
- `02 Returns and costs`: rate figures in 5 beside `SourceCosts` in 7, each under a mono `Eyebrow`
  subheading; "Add cost" sits beside the costs subheading.
- `03 Movements` (`ViewAll` in the rail) and `04 Documents` stay full width.
- Update `docs/screens.md` for `/accounts/$type/$id`.
- Section numbering must follow what renders (yield only exists for products with a rate; pockets have
  move-money). No gaps.

Validation: the harness has no documents fixture yet. Add `[/^\/api\/documents$/, () => []]` (check
`features/documents/documents-api.ts` for the exact path) and render `?page=source`, which maps to
`/accounts/product/p1`. The balances fixture has p1 (COP 8.450.000), p2, p3, p4 (pocket "Vacaciones") and
the card k1, so both a product with a rate (p2/p4) and a pocket (p4) can be exercised by changing the mock's
`SourcePage` id.

### 2. Final sweep (spec S15, task T14) — done

- Render every page at 1440, 1280, 1024 and 390 in the harness; `document.documentElement.scrollWidth -
  innerWidth` must be 0.
- `agent-browser a11y --tags wcag2a,wcag2aa` per page: 0 violations.
- Heading order h1 > h2 > h3 on every page.
- `pnpm check-types && pnpm test && pnpm build`.
- Close the goal and report; the delivery is the working tree, no push or PR.

## How to run and validate

```pwsh
# 1. The harness (background job; restart it whenever apps/web/mock/main.tsx changes)
pnpm --filter @dqfinance/web exec vite --config mock.vite.config.ts

# 2. Any page
agent-browser --session dq-pages open "http://localhost:3200/mock/?page=recurring"
agent-browser --session dq-pages set viewport 1440 900
agent-browser --session dq-pages screenshot --full C:/Temp/shots/recurring.png
agent-browser --session dq-pages eval "document.documentElement.scrollWidth-innerWidth"
agent-browser --session dq-pages a11y --json

# 3. The gates
pnpm check-types; pnpm test; pnpm build
```

`?page=` values: `overview`, `accounts`, `budgets`, `calendar`, `contacts`, `contact` (id cp3), `incomes`,
`savings`, `settings`, `recurring`, `import`, `transactions`, `transfers`. `source` is not wired yet.

## Gotchas (all hit in practice)

- **workerd cannot start on this machine**: `CreateDirectory: #5 Acceso denegado; path = miniflare-email-store`,
  reproduced with a fresh `TEMP`. The harness is the only browser path; never claim a Workers-runtime check.
- **i18n is compiled**: after adding a string, run `pnpm --filter @dqfinance/i18n build` (or any root
  `check-types`) before rendering, or the page crashes on `m.new_key is not a function` and shows a blank body.
- **Mock entry HMR goes stale**: after editing `apps/web/mock/main.tsx`, kill and restart the harness. Once it
  served an old `pages` map and `?page=recurring` rendered the overview.
- **No duplicate i18n keys**: a second `settings_account` was silently collapsed by `JSON.parse`. Scan with
  `Select-String -Path packages/i18n/messages/*.json -Pattern '^\s*"([^"]+)":'` + `Group-Object`.
- **PowerShell**: quote refs (`'@e13'`); an unquoted `@e13` is splatting. Nested quotes in `eval` break;
  prefer `[...document.querySelectorAll('a')].filter(...)` over CSS attribute selectors with quotes.
- **Fake dates**: the harness runs against the system date (2026-11-06/07) and the fixtures are dated around
  it; a calendar day needs `?day=2026-11-04`.
- **Tests**: `celebrated-backfill.test.ts` allows ±100ms because SQLite's clock differs from `Date.now()`;
  do not "tidy" it back to an exact comparison.
- **routeTree.gen.ts**: `tsr generate` rewrites it; if `git status` shows it with an empty diff, it is a line
  ending refresh — `git checkout -- apps/web/src/routeTree.gen.ts`.
- The mock (`apps/web/mock/`, `mock.vite.config.ts`) is gitignored; a fresh checkout must recreate it (see the
  Validation section of `odd/tasks/dashboard-distribution.md`).

## Decisions already made (do not relitigate)

- A section label never repeats the page h1: `By bank`, `Monthly limits`, `Goals`, `Incomes`,
  `All transfers`, `All contacts`, `Breakdown`, `Account settings`, `Monthly plan`, `Limits`.
- Single-list pages get one section; the rail narrows content to 9 of 12 columns, which is acceptable for
  lists but was **not** for `/transactions` (tried and reverted: the label repeated the h1 and the ledger got
  too narrow).
- `/calendar` pairs only when both sides have rows; no invented empty column.
- Rows that wrap get `ml-auto` on the amount block (`/recurring`, `IncomeRow`), and `SourceLine` puts the
  amount full width on phones (`/accounts`).
- Chart `YAxis width` is 64 (was 56) so "150 mil" is not clipped at 7 columns.

## Evidence so far

- Round 6 (all 13 routes restructured): every page variant at 1440/1280/1024/390 with 0 horizontal
  overflow, axe wcag2a/2aa 0 violations, heading order h1 > h2 > h3; `pnpm check-types`, `pnpm test`,
  `pnpm build` pass.
- `pnpm check-types` ✅, `pnpm test` ✅ 412 + 58, `pnpm build` ✅ 3.16 s (round 5).
- Every restructured page: 0 horizontal overflow at 1440/1280/1024/390, axe wcag2a/2aa 0 violations.
- Screenshots in `C:\Temp\shots\` (`accounts-new.png`, `recurring-2.png`, `calendar-full.png`,
  `budgets-new.png`, `savings-new.png`, `incomes-new.png`, `transfers-new.png`, `contacts-2.png`,
  `contact-chart.png`, `settings-new.png`, `import-new.png`).
- Known gap: the signed-in top bar was never rendered (workerd), so the rail was verified inside the harness
  shell, not the real authenticated shell.
