# Follow-ups orchestration: handoff

Goal (user, 2026-10-19): implement every item in [the redesign follow-ups](./2026-10-19-web-redesign.md#follow-ups-not-built) automatically, using shadcn/ui components, orchestrating subagents (`gentle-ai-worker` writes, the orchestrator verifies and commits). Merge to `main` and push at the end (the user approved pushing `main` before).

## Rules for the orchestrator

- Delegate; keep orchestrator context small. One writer per worktree at a time.
- `gentle-ai-worker` tasks need a `## Allowed edit surfaces` section (repo-relative paths/globs, one per line).
- Workers never commit. After each worker: run `pnpm check-types && pnpm test && pnpm build` from the root, then commit only the worker's paths (never `skills-lock.json`, `.agents/`, `.claude/`, `docs/plans/2026-10-18-session-handoff.md`).
- `apps/web/src/routeTree.gen.ts` gets CRLF churn from the running dev server: `git checkout -- apps/web/src/routeTree.gen.ts` before switching branches or merging, and stage it only when a route was added.
- i18n JSON conflicts between branches: resolve by key union (stage 2 + stage 3, no key differs).
- Migrations (`pnpm --filter @dqfinance/api db:generate`, then `pnpm db:migrate:local`) only in one branch at a time, so drizzle journal numbers never collide.

## Branches and worktrees

- `feat/follow-ups` in the main worktree (`dqfinance/`): UI stream. First commit `8df52e0` (user's react-doctor hook).
- `feat/follow-ups-api` in `../dqfinance-wt-api`: API-only stream, branched from `8df52e0`. Merge it into `feat/follow-ups` when its worker is done, then remove the worktree (`git worktree remove ../dqfinance-wt-api`).

## Work units

| # | Unit | Status |
| --- | --- | --- |
| W1 | shadcn foundation: sonner, skeleton, empty, field, toggle-group, alert-dialog, native-select, separator, spinner; restyle checklist in DESIGN.md | done: `f883bf6`; W2 merged in `a407dfb`; gate green |
| W2 | `summarize_transactions` MCP tool (#9) + Web Push for transfers, mark received, adjustments (#11) | done: `f492e3b`, merged in `a407dfb` |
| W3a/W4a | API: `GET /api/balances/history`, product `annual_rate_bps` + yield estimate, card brand/rate/color (one migration) | done: `de0da03`, merged in `132c3fa` |
| W8a/W9a | API: documents on R2 + `import_transactions` (HTTP + MCP, dry run) | done: `71f53d3`, merged in `fad39a2`, migration 0003 applied locally; api worktree removed |
| W3 | #1 balance history API (`GET /api/balances/history?months=`, pure fold in `compute-balances.ts` style, test) + chart on overview (3M/12M) and source page; assets `ink`, liabilities `muted-foreground` | done: `4b42d1e` (recharts 3.8, not a hand-rolled SVG) |
| W4 | #2 yield: nullable `annual_rate_bps` on product (migration, create/edit, MCP), "≈ per month / per day" estimate on the source page. #3 card: brand, interest rate + period (MV/EA), color (presentation) on card (migration, dialog, MCP) | done: `4b42d1e` (web), `de0da03` (API) |
| W5+W6+W10 | #4 costs, #8 movement filters in the URL, #10 profile menu | done: `54a6c5e`; API `de0da03` merged in `132c3fa`; migration 0002 applied locally; gate green |
| W3+W4 web | chart (shadcn chart), yield block + product edit, card brand/rate/color + preview + card edit | done: `4b42d1e` (recharts 3.8) |
| W7 | full-page `/accounts/new` + `/accounts/new-card`, lazy chart, last react-doctor findings | done: `e4fe794` |
| W8+W9 web | documents section on the source page, `/transactions/import` CSV page with preview, keep typed values on partial failure | done: `68c45d3` |
| W5 | #4 costs: on the source page, the recurring expenses whose source is this one, plus "Add cost" prefilled (bank fees category) | done: `54a6c5e` |
| W6 | #8 transactions filters in route search params (`validateSearch`), "View all" link from the source page | done: `54a6c5e` |
| W7 | #7 full-page create routes for account (opening balance as large first field = product + adjustment) and card (live card preview); mobile entry points use them | done: `e4fe794` |
| W8 | #5 documents: R2 binding, `document` table, upload/list/download/delete routes with ownership checks, section on the source page | done: `71f53d3` (API), `68c45d3` (web) |
| W9 | #6 import: `import_transactions` MCP tool (batch, duplicate detection by source + date + amount + description) + web CSV paste/upload page with a review step | done: `71f53d3` (API; CSV, no PDF/video), `68c45d3` (web) |
| W10 | #10 profile: header avatar (shadcn `avatar`) + `dropdown-menu` with name, email, settings, sign out. Multi-ledger profiles stay out (domain decision) | done: `54a6c5e`; multi-ledger still out |
| Final | verify in browser (390 / 1440), DESIGN.md and follow-ups list updated (mark done), merge `feat/follow-ups` into `main`, push | todo: follow-ups list updated here; DESIGN.md in progress by the other worker; no browser run; merge and push pending |

## API contract from W3a/W4a (for the web tasks)

- `GET /api/balances/history?months=1..24&sourceType=&sourceId=` → `[{ at, totals: [{ currency, assets, liabilities }], source: { currency, amount } | null }]` (month ends UTC, last point is now).
- `GET /api/balances` accounts add `annualRateBps`, `estimatedYield: { monthly, daily } | null`.
- `GET /api/accounts`: product `annualRateBps`; card `brand`, `interestRateBps`, `interestRatePeriod` ('monthly' = MV | 'annual' = EA), `color` ('ink'|'signal'|'sand'|'moss'|'clay'|'ocean').
- `POST /api/accounts/products` takes `annualRateBps`; `PATCH /api/accounts/products/:id` { type?, name?, currency?, annualRateBps? }.
- `POST /api/accounts/cards` takes brand, interestRateBps, interestRatePeriod, color; `PATCH /api/accounts/cards/:id` takes those plus name, last4, creditLimit, statementDay, dueDay (null clears).
- MCP: get_balance_history, create_product, update_product, create_card, update_card, summarize_transactions.

## API contract from W8a/W9a (documents, import)

- `POST /api/documents` multipart: `sourceType`, `sourceId`, `name?`, `file` (PDF/JPEG/PNG/WebP/HEIC, max 10 MB) → 201 `{ id, source: { type, id }, name, contentType, sizeBytes, createdAt }`; errors `document_too_large` 413, `document_type_not_allowed` 415, `source_not_found` 404. RPC: `api.api.documents.$post({ form })`.
- `GET /api/documents?sourceType=&sourceId=` → array, newest first. `GET /api/documents/:id` → file body with Content-Disposition (use `.blob()`, not `unwrap()`). `DELETE /api/documents/:id` → `{ id }`. MCP `list_documents`.
- `POST /api/transactions/import` `{ source: { type, id }, rows: [{ type, amount, occurredAt, description?, categoryId? }] (1..500), dryRun }` → `{ created, skipped, rows: [{ type, amount, occurredAt, description, categoryId, categoryName, duplicate }] }`. Rows use the source's currency (no foreign card charges). MCP `import_transactions` (dry run first, then confirm).
