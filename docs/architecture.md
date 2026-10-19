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
- `balances/`: `compute-balances.ts` (pure) is the one place for every balance, debt, cost basis, in-transit rule, and the as-of-date history. Also owns the list tools (`list_accounts`, `get_balance_history`).
- `mcp/`: the MCP server; collects every feature's tools and guards `/mcp`.

Build on `source.ts` and `compute-balances.ts` instead of re-deriving their rules.

### Web (`apps/web/src/features/`)

- `auth/`: also the OAuth consent card.
- `settings/`: also manages categories; `categories/` holds only the query hooks.
- `accounts/`: also the adjust-balance dialog and the source picker other forms reuse.
- `balances/`: the overview and the source detail page (`/accounts/$type/$id`).
- `counterparties/`: the contacts page.

`shared/api.ts` is the single Hono RPC client, with `unwrap()`.

## Dependency order

A feature imports only from features earlier in this order:

```
settings → accounts → categories → counterparties → transactions → transfers
         → balances → balance-adjustments → recurring-expenses
```

Anything two features need that is not a domain noun moves to `shared/`, and `shared/` imports nothing from `features/`.

## Turborepo

- Keep `"ui": "stream"` in `turbo.json`: under the TUI on Windows (ConPTY), `wrangler dev` starts but its worker answers no request.
- Keep task caching as configured: `packages/i18n` generates `src/paraglide/` during `build`, and `check-types`, `dev`, and `test` depend on `^build` so it exists first.
