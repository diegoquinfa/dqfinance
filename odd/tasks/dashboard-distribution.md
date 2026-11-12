# Overview dashboard — content distribution

Objective: reorganize the `/overview` content so the page reads like a dashboard (summary band, then alerts, then the month, then wealth, then inventories, then activity), borrowing only the *arrangement* of migarra.app's demo. Visual language stays dqfinance's: rail sections, hairline rows, mono labels, tokens only. Branch `new-distribution`; delivery is the working tree plus a verified build, no push or PR. Runner: pnpm from the repo root.

## Specs

S1. The page opens with a summary band instead of one more stacked block: on the left the `01` total balance with its other currencies and any in-transit amounts, on the right the period controls with their Spent / Received / Net cells in one hairline strip (`PeriodTotals` with `showNet`). The band keeps the single `01` index and the `sr-only` h1.
S2. "To confirm" (pending recurring expenses) moves directly under the summary band and renders only when it has items (its skeleton while the query loads). Section numbers are computed from the visible order starting at `02`, with no gaps, following the dynamic-numbering pattern already used by `source-page.tsx`.
S3. "This month" is one section that puts the forecast (hint paragraph plus chart) in 7 of 12 columns and the safe-to-spend card in 5 of 12, side by side from `lg`.
S4. "Net worth" is one section that puts the per-currency figures (5 of 12) beside the balance history chart (7 of 12).
S5. "Accounts and cards" is one section that puts the accounts list (7 of 12) beside the credit-card list (5 of 12). Each half carries its own mono sub-label; the accounts "View all" action stays in the section rail.
S6. "Recent movements" closes the page as its own section with full-width content (8 movements, as today).
S7. New UI strings exist in both catalogs; no new colors, spacing scales, typography utilities, `Card`/raised panels, or boxed lists. Sections keep the `Section` rail; lists keep `rowsClass` hairlines.
S8. `DESIGN.md` (the overview exception in Layout) and the `/overview` row of `docs/screens.md` describe the new distribution.

## Tasks

| ID | Spec | Route | Surface | State |
| --- | --- | --- | --- | --- |
| T1 | S7 | delegated | `packages/i18n/messages/en.json`, `packages/i18n/messages/es.json` | done |
| T2 | S1-S6, S7 | delegated | `apps/web/src/features/balances/overview-page.tsx`, `apps/web/src/features/balances/period-totals.tsx` | done |
| T3 | S8 | delegated | `DESIGN.md`, `docs/screens.md` | done |
| T4 | all | parent | verification: `pnpm check-types`, `pnpm test`, `pnpm build` | done |

## Validation

`wrangler dev` and `wrangler d1 migrations apply --local` cannot start on this machine: workerd aborts with `CreateDirectory: #5 Acceso denegado; path = miniflare-email-store`. The failure reproduces with a minimal workerd config outside the repository, so it is the runtime, not the app. The dashboard is therefore checked in a real browser through a local harness, always with **agent-browser** (not ego-browser):

```pwsh
pnpm --filter @dqfinance/web exec vite --config mock.vite.config.ts      # http://localhost:3200/mock/
$env:AGENT_BROWSER_SESSION = 'dqfinance-<id>'                            # agent-browser session id --scope worktree --prefix dqfinance
agent-browser open http://localhost:3200/mock/
agent-browser set viewport 1440 900
agent-browser screenshot --full C:/Temp/shots/desktop.png               # create the folder first
```

`apps/web/mock/` renders the real `OverviewPage` with the real stylesheet against stubbed `/api/*` payloads (`fixtures.ts`), and `mock.vite.config.ts` aliases `@tanstack/react-router` to a plain anchor. Both are gitignored and never imported by the app.

Checks that caught real defects and stay in the loop:
- **Horizontal overflow**: `agent-browser eval` of `document.documentElement.scrollWidth - innerWidth` at 1440, 1299, 1100, 1024 and 900. A grid item without `min-w-0` and a `type-display` amount inside the 5/12 column pushed the page 52 px wide at 1100.
- **Phone layout**: `agent-browser set viewport 390 844`, then a full-page screenshot.
- **Numbering without pending items**: open `/mock/?empty=1` and read the `section h2` texts; they must run 01-05 with no gap.
- **Interactions**: `agent-browser snapshot -i` for refs, then `agent-browser click '@e21'` (year period) and `agent-browser click '@e33'` (statement dialog, closes with `agent-browser press Escape`). Quote refs in PowerShell: `@e21` alone is parsed as splatting.
- **Accessibility**: `agent-browser a11y --tags wcag2a,wcag2aa`.

## Log

L1 (user, verbatim): "Mi llave, quiero que nevegues la demo de https://www.migarra.app con la skill ego-browser y analices que podemos agregar de ahi para dqfinance, funcionalidades, etc. Pero ademas, me gustaria mejorar el dashboard de dqfinance, optimicemos la distribucion del contenido, NO copiar el disenio, colores, etc. Solo copiar la distribucion, como organiza el contenido. Vamos a hacer esa reeorganizacion del contenido, utiliza sub agentes lo mas que puedas para paralelizar trabajo. Siempre, nunca afirmes haber terminado sin validar con pruebas que el cambio esta hecho"

L2: migarra demo inspected with ego-browser (space 3): landing, `/dashboard`, `/analytics`, `/patrimonio`. The dashboard distributes: header with period + actions, a full-width alert strip for upcoming recurring charges, a row of four KPI cells, a highlighted month forecast line, an "important today" pair, a full-width income/expense chart, then a wide chart beside a stack of narrow panels, then paired cards and a three-up footer. Distribution only; its cards, colors and typography are not copied.

L3: local visual check is unavailable on this machine: `wrangler`/workerd aborts with `CreateDirectory: #5 Acceso denegado; path = miniflare-email-store` under miniflare 5 beta, so the dev server never starts. Verification therefore rests on typecheck, tests and build, and the browser check is reported as unavailable, never as passed.

L4 (2026-11-06): the harness does start, and the page was rendered and read: 1440 (band side by side), 1280 (band stacked by the container query added in `dashboard-shell`), 1024 and 390 (one column), no horizontal overflow, axe wcag2a/2aa with 0 violations. The `dl` that used to hold a `Separator` as a direct child was the one real defect the audit found; it is fixed in `overview-page.tsx`.
