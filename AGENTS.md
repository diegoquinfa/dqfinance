<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": true` in the root `turbo.json` or `turbo.jsonc` to opt in; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

Always use the skill ponytail

# DQFinance — agent rules

The domain model, its invariants, and the implementation order are in [docs/plans/2026-10-18-finance-domain-design.md](./docs/plans/2026-10-18-finance-domain-design.md). Every domain noun used in code is defined in [GLOSSARY.md](./GLOSSARY.md). UI rules live in [DESIGN.md](./DESIGN.md).

## Map

| Path | What | Stack |
| --- | --- | --- |
| `apps/api` | REST API, OAuth 2.1 authorization server, MCP server at `/mcp` | Cloudflare Workers, Hono, Better Auth + `@better-auth/mcp`, `@tanstack/ai-mcp`, D1 + Drizzle |
| `apps/web` | Web app, plus the OAuth sign-in and consent pages | TanStack Start (React), TanStack Query, Tailwind v4, shadcn/ui |
| `packages/i18n` | Message catalog shared by the API and the web | Paraglide (Inlang), locales `en` and `es` |

## Architecture: screaming, vertical slices, clean dependencies

The folder tree names the business, not the framework. Open `features/` and you should see `transactions/`, `accounts/`, `balances/`. You should not see `controllers/` or `services/`.

Each feature folder owns everything it needs. Nothing about a feature lives outside its folder, except the registration lines in the composition roots.

### API

```
apps/api/src/
  index.ts                 composition root: middleware, mounts every feature's routes
  db.ts                    composition root: registers every feature's *.schema.ts
  features/
    auth/                  Better Auth config, generated schema, session guard, ownerId column
    settings/              user settings (country, language, timezone, currencies)
    onboarding/            the wizard's single write: settings + currencies + categories + cash
    accounts/              banks, bank accounts, products, cash wallets, cards, and source.ts
    categories/            categories; system ones are translated on read
    counterparties/        people and businesses (Contact / Business)
    transactions/          income and expenses on one source
    transfers/             own-money movements, fees, in transit, FX settlement
    balances/              compute-balances.ts (pure) + get-balances.ts + the list tools
    balance-adjustments/   "edit balance": observed balance + computed delta
    recurring-expenses/    schedule + the "to confirm" inbox
    mcp/                   the MCP server: collects every feature's tools, guards /mcp
```

### Web

```
apps/web/src/
  features/
    auth/                  auth client, sign-in form, consent card, language switch
    settings/              settings page (language, currencies, categories)
    onboarding/            the wizard
    accounts/              accounts page, create dialogs, adjust-balance dialog, source picker
    balances/              overview page
    categories/            query hooks
    counterparties/        contacts page
    transactions/          movement form, movement list
    transfers/             transfer form, transfer list
    recurring-expenses/    recurring page and inbox actions
  shared/
    api.ts                 the single Hono RPC client and unwrap()
```

### Dependency order

A feature may use another feature's modules **earlier** in this order, never later, and never in a cycle:

```
settings → accounts → categories → counterparties → transactions → transfers
         → balances → balance-adjustments → recurring-expenses
```

Anything two features need that is not a domain noun moves to `shared/`. `shared/` never imports from `features/`.

Two modules exist specifically so the rules live in one place: `accounts/source.ts` (where money is, ownership checks, currency, the three-nullable-FK shape) and `balances/compute-balances.ts` (every balance, debt, cost basis and in-transit rule). Add a feature on top of them instead of re-deriving the rules.

### Adding a feature (API)

1. Create `src/features/<feature>/` with `<entity>.schema.ts`, one file per use case, `<feature>.routes.ts`, and `<feature>.tools.ts`.
2. Register the schema in `src/db.ts`, the routes in `src/index.ts` (`.route('/api/<feature>', ...)`), and the tools in `src/features/mcp/mcp.routes.ts`.
3. Run `pnpm --filter @dqfinance/api db:generate`, then `db:migrate:local`. Commit the generated SQL in `migrations/`.
4. Add message keys for new error codes to both catalogs and to `ERROR_CODES` in `shared/http.ts`.

### Adding a feature (web)

1. Create `src/features/<feature>/` with `<feature>-api.ts` (TanStack Query options and hooks over `shared/api`) and its components.
2. Add a route file under `src/routes/_app/` that only composes the feature page component.
3. Shared primitives come from `#/shared/ui`. Add new ones with `pnpm dlx shadcn@latest add <name>`, run from `apps/web`.

## Naming

- Files and folders: `kebab-case`. Suffixes state the role: `.schema.ts`, `.routes.ts`, `.tools.ts`, `.test.ts`, `-api.ts`, `-page.tsx`, `-dialog.tsx`.
- Use case files and functions are verb-first: `create-transaction.ts` → `createTransaction`.
- Zod input schemas are named `<useCase>Input` (`createTransactionInput`). Inferred types use PascalCase (`CreateTransactionInput`).
- React components: `PascalCase` exports in `kebab-case` files (`transaction-form.tsx` → `TransactionForm`).
- Database: tables singular `snake_case` (`transaction`), columns `snake_case`, Drizzle fields `camelCase`.
- MCP tools: `snake_case` verbs (`create_transaction`).

## TypeScript and quality

- No `any` except in the documented shim `apps/web/src/shared/api-globals.d.ts`.
- Validate every external input with zod at the boundary: HTTP bodies and query strings, MCP tool arguments, and env-dependent config.
- **Money:** amounts are stored as integer cents (`amount_cents`), always positive; `type` carries the sign. Use `toCents` and `fromCents` from `apps/api/src/shared/money.ts` (web: `shared/money.ts` for display). ISO minor units are not used, because ICU reports 0 digits for COP.
- **Ownership:** every query on user data filters by `userId`. The `userId` comes from the session (`requireSession`) or from the token's `sub` claim (MCP). It never comes from client input. Tables take their owner column from `features/auth/owner.ts`.
- **Balances are computed, never stored** (design D1). "Editing" a balance inserts a `balance_adjustment` (D2). Transfers and adjustments are not income or expense (D3).
- New non-trivial logic (money, FX, dates, ownership, branching) ships with a small `node:test` test next to it (`*.test.ts`, run with `pnpm test`). Pure rules are separate files from the database work so they are testable without D1.
- Errors: use cases throw `AppError(code, status)`; `onError` renders `{ code, message }` with the message translated. Never build an error response by hand.
- Before you finish: `pnpm check-types && pnpm test && pnpm build` from the root must pass.
- Keep `"ui": "stream"` in `turbo.json`. Under the TUI on Windows (ConPTY), `wrangler dev` starts but its worker stops answering every request.
- Do not disable caching by hand: `packages/i18n` generates `src/paraglide/` during `build`, and `check-types`/`dev`/`test` depend on `^build` so it always exists first.
- Generated files are not edited by hand: `features/auth/auth.schema.ts` (`pnpm --filter @dqfinance/api auth:schema`), `migrations/` (`db:generate`), `worker-configuration.d.ts` (`cf-typegen`), `routeTree.gen.ts`, `packages/i18n/src/paraglide/`.

## Pre-commit: file size

`.githooks/pre-commit` refuses a commit when a staged file exceeds **5,000 tokens** (1 token = 4 bytes, so 20,000 bytes). Two things to know:

- It measures the **staged blob**, not the working tree, so a partially staged file is judged on what will actually be committed.
- It skips what no agent authors: lockfiles, codegen (`routeTree.gen.ts`, `worker-configuration.d.ts`, `auth.schema.ts`, `migrations/`, `paraglide/`), installed skills under `.agents/skills/`, build output, binaries and media. The list is `IGNORED` in `scripts/check-file-size.mjs`; add a pattern there when a new generator appears.

After cloning without installing: `git config core.hooksPath .githooks`. On Linux and macOS the hook needs its exec bit, so add it with `git add --chmod=+x .githooks/pre-commit`.

## Internationalization

- One catalog for both apps: `packages/i18n/messages/{en,es}.json`. Add every user-facing string to **both** files. Never write UI or error text as a literal.
- Server code passes the locale explicitly: `m.key({}, { locale })`. There is no per-request global state.
- API locale per request: `Accept-Language` (the web client always sends its current locale) from `shared/locale.ts`; MCP uses the user's saved `locale`.
- API errors are `{ code, message }`: `code` is stable and safe to branch on, `message` is already translated.
- Categories: user categories store their name; system categories (`fx_loss`, `fx_gain`, `bank_fees`) store only a key and are translated on every read. Default categories are created in the language the user picked at onboarding.
- MCP tool descriptions are English (models handle it best); the data they return is the user's own.
- Money and dates are formatted with `Intl` in the current locale, and only through `shared/money.ts` / `shared/dates.ts`.
- Switching language: `LocaleSwitch` in `features/auth`. Signed-in users persist the choice through `PATCH /api/settings`, because the signed-in shell applies the saved preference on load.

## How the MCP server is wired

```
MCP client (Claude, Cursor, …)
   │ 1. POST /mcp without a token → 401 + WWW-Authenticate: resource_metadata=…/.well-known/oauth-protected-resource/mcp
   │ 2. discovers the authorization server (/.well-known/oauth-authorization-server/api/auth)
   │ 3. registers itself (DCR: /api/auth/oauth2/register)
   │ 4. authorization code + PKCE → user signs in at WEB_URL/sign-in, approves at WEB_URL/consent
   │ 5. receives a JWT access token, audience-bound to BETTER_AUTH_URL/mcp
   ▼
apps/api  /mcp
   requireMcpAuth (Better Auth)   verifies signature (JWKS), issuer, audience, expiry, required scopes
        │ claims.sub = userId
   mcpServer.handle(request, { context: { db, userId, locale } })   (TanStack AI MCP, stateless)
        │
   transactions.tools.ts → createTransaction(ctx.context.db, ctx.context.userId, input)
```

- **Better Auth** (`@better-auth/mcp`) is the OAuth 2.1 authorization server. It serves discovery, DCR, authorize, token, and JWKS, and verifies tokens. **TanStack AI** (`@tanstack/ai-mcp/server`) is only the MCP protocol layer. It never sees raw tokens.
- Tools read the user from `ctx.context.userId` (type `McpContext`).
- `/mcp` requires every scope in `MCP_SCOPES` (`finance:read`, `finance:write`).
- Account setup stays in the web app.
- Read-only tools carry `metadata.annotations.readOnlyHint`. Tools that return a list wrap it in an object, so the response is a JSON object with `structuredContent`.
- **Workers gotcha:** `createAuth` runs per request. Do not cache the auth instance at module scope. Better Auth starts D1 I/O on init, and a Worker hangs when a request awaits I/O that belongs to another request.
- **Shortcut:** DCR is enabled because `@better-auth/cimd` ships only a Node transport. Switch to `cimd()` once there is a Workers-safe `fetchClientMetadataResource`.
