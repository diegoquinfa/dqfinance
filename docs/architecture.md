# DQFinance — architecture

## Workspaces

- `apps/api`: REST API, OAuth 2.1 authorization server, and the MCP server at `/mcp` (Hono, D1 + Drizzle). A library, not a Worker of its own. MCP wiring: [mcp.md](./mcp.md).
- `apps/web`: the web app, plus the OAuth sign-in and consent pages (TanStack Start). It is the one Cloudflare Worker: `src/server.ts` hands `/api/*`, `/.well-known/*` and `/mcp` to `apps/api` and the rest to TanStack Start, so both share one origin and the session cookie is first-party.

The Worker's `wrangler.jsonc` sits at the repo root, where the Deploy to Cloudflare button reads it; the Vite plugin points at it with `configPath`. Run `wrangler` from `apps/web` with an explicit `-c`: Wrangler ignores the build's redirected config when the user config lives in another directory.
- `packages/i18n`: the one message catalog both apps use (Paraglide).

## Vertical slices

Folders are named after the business (`transactions/`, `balances/`), never after framework roles (`controllers/`, `services/`). A feature folder owns everything about its feature; only its registration lines live in the composition roots ([Adding a feature](../CODING_STANDARDS.md#adding-a-feature)).

Folders whose name says what they own are not listed below.

### API (`apps/api/src/features/`)

- `onboarding/`: the wizard's single write (settings, currencies, categories, cash wallet).
- `demo/`: the demo ledger a guest finds when it signs in. `demo-ledger.ts` (pure) is the plan — the months, the movements and the transfers; `seed-demo.ts` writes it in one batch; `move-guest-data.ts` moves a guest's ledger to the account it becomes when it signs up.
- `accounts/`: banks, bank accounts, products, cash wallets, and cards. `source.ts` is the one place for where money is: ownership checks, currency, and the three-nullable-FK shape. `product-yield.ts` (pure) estimates what a product's balance earns from its annual rate.
- `transfers/`: also fees, the in-transit state, and FX settlement.
- `documents/`: files attached to a source (contract, terms, fee table) in R2. `document-rules.ts` (pure) holds the accepted types and the size limit; upload and download stay in the web app, since agents cannot carry binary.
- `transactions/`: the movements, their source and their date. `installments.ts` (pure) holds how an expense the user spread over several months is seen in parts; `search-terms.ts` (pure) holds which words of a search carry meaning.
- `balances/`: `compute-balances.ts` (pure) is the one place for every balance, debt, cost basis, in-transit rule, and the as-of-date history. Also owns the list tools (`list_accounts`, `get_balance_history`).
- `calendar/`: per day of the user's timezone, what moved and which recurring expenses fall due. `calendar-days.ts` (pure) does the day grouping and the projection.
- `spending/`: how much the user may spend today, and what the balance looks like day by day. `safe-to-spend.ts` and `spending-period.ts` (pure) hold the rule and the days left in the month; `income-period.ts` (pure) holds the payday the period ends on; `forecast.ts` (pure) holds the running balance of the projection.
- `budgets/`: what each category may spend in a month, and what it already spent. `budget-progress.ts` (pure) holds what is left of a limit and how close it is.
- `savings-goals/`: what the user is saving for and what they put into it. `goal-progress.ts` (pure) holds how much of a goal is saved and what it asks for every month.
- `expected-incomes/`: the money the user expects, with how often it arrives. `next-income-date.ts` (pure) holds the next payday, counted from the anchor so the day of the month never drifts.
- `webhooks/`: the places the user asked the app to call when a bill falls due. `webhook-signature.ts` (pure) holds the HMAC of the body; the endpoint goes through `shared/public-url.ts`, the same check the push endpoints use.
- `mcp/`: the MCP server; collects every feature's tools and guards `/mcp`. `guest-rule.ts` (pure) keeps a guest away from the tools.

Build on `source.ts` and `compute-balances.ts` instead of re-deriving their rules.

### Web (`apps/web/src/features/`)

- `auth/`: also the OAuth consent card, and the anonymous client that signs a guest in.
- `landing/`: the signed-out home at `/`.
- `demo/`: the "Try the demo" button and the seed call.
- `settings/`: also manages categories; `categories/` holds the query hooks and the category mark (`category-mark.tsx`) that settings, budgets and the movement dialog render. Also the webhooks block: the hooks the app calls when a bill falls due, and the days before it the app warns.
- `accounts/`: also the adjust-balance dialog and the source picker other forms reuse.
- `balances/`: the overview and the source detail page (`/accounts/$type/$id`).
- `documents/`: the file section on the source detail page, which `balances/source-page.tsx` renders. No page of its own, and it imports only the `SourceRef` type from `accounts/`.
- `counterparties/`: the contacts list and the contact detail page (`/contacts/$id`).
- `spending/`: the card on the overview that says how much the user may spend today, and the forecast of the balance day by day.
- `savings-goals/`: the savings goals page (`/savings`) and its query hooks.
- `expected-incomes/`: the expected incomes page (`/incomes`) and its query hooks.
- `budgets/`: the budgets page (`/budgets`) and its query hooks.

`shared/api.ts` is the single Hono RPC client, with `unwrap()`.

## Dependency order

A feature imports only from features earlier in this order:

```
categories → settings → accounts → documents → counterparties → transactions
           → recurring-expenses → balances → balance-adjustments → transfers → calendar
           → savings-goals → expected-incomes → spending → webhooks → budgets → demo
```

`auth/` is a foundation in both apps (the API's `mcp/` and `push/` too), outside the order: any feature may import it.

The API's `demo/` writes the rows of every feature's tables, so it sits last; the composition root (`index.ts`) wires its guest handoff, which keeps `auth/` from importing a feature.

Six dependencies the order cannot express, the first two long-standing:

- **Table definitions point both ways.** A `*.schema.ts` declares foreign keys into another feature's tables, and the queries that read those tables import them the same way: `transactions/transaction.schema.ts` references `recurring-expenses` and `transfers`, and `balances/get-balances.ts` reads the `transfer` and `balance_adjustment` tables. Read these as data references; the order governs each feature's logic.
- **The API's `categories/` reads the `transaction` table.** `delete-category` and `merge-categories` need to know whether a category still holds movements, so they read the `transaction` table. It is a data reference, like the table definitions that point both ways; the order still governs the feature's logic.
- **The web `accounts/` and `balances/` slices reference each other.** `balances/` renders the account rows and the source detail page, and `accounts/sources.ts` reads balances through `balances-api`. Unwinding it means moving the source list and the balance query into `shared/`.
- **The web `balances/`, `transfers/` and `accounts/` slices reference each other.** `balances/source-page.tsx` opens `transfers/new-transfer-dialog`, which pulls `accounts/sources`, and `accounts/new-pocket-page.tsx` creates a transfer through `transfers/transfers-api` to move money into a pocket, so `balances → transfers → accounts → balances` is a cycle the order cannot express. It is safe because no module runs anything at import time. Nothing else may add edges across the order.
- **The web `counterparties/` and `transactions/` slices reference each other.** `counterparties/contact-page.tsx` renders the shared movement row and reads the contact list, and `transactions/new-transaction-dialog.tsx` reads the contact list to offer it, so `transactions → counterparties → transactions` is a cycle the order cannot express. It is safe because no module runs anything at import time. Unwinding it means moving `TransactionRow` into `shared/`.
- **The web `balances/` and `spending/` slices reference each other.** The overview (`balances/`) opens with the safe-to-spend card, so `balances → spending`. The card only reads the spending API, and nothing in `spending/` reads the balances slice, so the edge does not close.

Anything two features need that is not a domain noun moves to `shared/`, and `shared/` imports nothing from `features/`.

## Turborepo

- Keep `"ui": "stream"` in `turbo.json`: under the TUI on Windows (ConPTY), `wrangler dev` starts but its worker answers no request.
- Keep task caching as configured: `packages/i18n` generates `src/paraglide/` during `build`, and `check-types`, `dev`, and `test` depend on `^build` so it exists first.
