# DQFinance — architecture

## Workspaces

- `apps/api`: REST API, OAuth 2.1 authorization server, and the MCP server at `/mcp`, on Cloudflare Workers (Hono, D1 + Drizzle). MCP wiring: [mcp.md](./mcp.md).
- `apps/web`: the web app, plus the OAuth sign-in and consent pages (TanStack Start).
- `packages/i18n`: the one message catalog both apps use (Paraglide).

## Vertical slices

Folders are named after the business (`transactions/`, `balances/`), never after framework roles (`controllers/`, `services/`). A feature folder owns everything about its feature; only its registration lines live in the composition roots ([Adding a feature](../CODING_STANDARDS.md#adding-a-feature)).

Folders whose name says what they own are not listed below.

### API (`apps/api/src/features/`)

- `onboarding/`: the wizard's single write (settings, currencies, categories, cash wallet).
- `accounts/`: banks, bank accounts, products, cash wallets, and cards. `source.ts` is the one place for where money is: ownership checks, currency, and the three-nullable-FK shape. `product-yield.ts` (pure) estimates what a product's balance earns from its annual rate.
- `transfers/`: also fees, the in-transit state, and FX settlement.
- `documents/`: files attached to a source (contract, terms, fee table) in R2. `document-rules.ts` (pure) holds the accepted types and the size limit; upload and download stay in the web app, since agents cannot carry binary.
- `balances/`: `compute-balances.ts` (pure) is the one place for every balance, debt, cost basis, in-transit rule, and the as-of-date history. Also owns the list tools (`list_accounts`, `get_balance_history`).
- `mcp/`: the MCP server; collects every feature's tools and guards `/mcp`.

Build on `source.ts` and `compute-balances.ts` instead of re-deriving their rules.

### Web (`apps/web/src/features/`)

- `auth/`: also the OAuth consent card.
- `settings/`: also manages categories; `categories/` holds only the query hooks.
- `accounts/`: also the adjust-balance dialog and the source picker other forms reuse.
- `balances/`: the overview and the source detail page (`/accounts/$type/$id`).
- `documents/`: the file section on the source detail page, which `balances/source-page.tsx` renders. No page of its own, and it imports only the `SourceRef` type from `accounts/`.
- `counterparties/`: the contacts page.

`shared/api.ts` is the single Hono RPC client, with `unwrap()`.

## Dependency order

A feature imports only from features earlier in this order:

```
categories → settings → accounts → documents → counterparties → transactions
           → recurring-expenses → balances → balance-adjustments → transfers
```

`auth/` is a foundation in both apps (the API's `mcp/` and `push/` too), outside the order: any feature may import it.

Three dependencies the order cannot express, the first two long-standing:

- **Table definitions point both ways.** A `*.schema.ts` declares foreign keys into another feature's tables, and the queries that read those tables import them the same way: `transactions/transaction.schema.ts` references `recurring-expenses` and `transfers`, and `balances/get-balances.ts` reads the `transfer` and `balance_adjustment` tables. Read these as data references; the order governs each feature's logic.
- **The web `accounts/` and `balances/` slices reference each other.** `balances/` renders the account rows and the source detail page, and `accounts/sources.ts` reads balances through `balances-api`. Unwinding it means moving the source list and the balance query into `shared/`.
- **The web `balances/`, `transfers/` and `accounts/` slices reference each other.** `balances/source-page.tsx` opens `transfers/new-transfer-dialog`, which pulls `accounts/sources`, and `accounts/new-pocket-page.tsx` creates a transfer through `transfers/transfers-api` to move money into a pocket, so `balances → transfers → accounts → balances` is a cycle the order cannot express. It is safe because no module runs anything at import time. Nothing else may add edges across the order.

Anything two features need that is not a domain noun moves to `shared/`, and `shared/` imports nothing from `features/`.

## Turborepo

- Keep `"ui": "stream"` in `turbo.json`: under the TUI on Windows (ConPTY), `wrangler dev` starts but its worker answers no request.
- Keep task caching as configured: `packages/i18n` generates `src/paraglide/` during `build`, and `check-types`, `dev`, and `test` depend on `^build` so it exists first.
