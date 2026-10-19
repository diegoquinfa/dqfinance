# DQFinance — coding standards

Rules consulted while writing code. The architecture, the dependency order, and the domain invariants (money, ownership, balances) live in [AGENTS.md](./AGENTS.md).

## Naming

- Files and folders: `kebab-case`. Suffixes state the role: `.schema.ts`, `.routes.ts`, `.tools.ts`, `.test.ts`, `-api.ts`, `-page.tsx`, `-dialog.tsx`.
- Use case files and functions are verb-first: `create-transaction.ts` → `createTransaction`.
- Zod input schemas are named `<useCase>Input` (`createTransactionInput`). Inferred types use PascalCase (`CreateTransactionInput`).
- React components: `PascalCase` exports in `kebab-case` files (`transaction-form.tsx` → `TransactionForm`).
- Database: tables singular `snake_case` (`transaction`), columns `snake_case`, Drizzle fields `camelCase`.
- MCP tools: `snake_case` verbs (`create_transaction`).

## Types and input validation

- `any` lives only in the documented shim `apps/web/src/shared/api-globals.d.ts`; everywhere else, type precisely.
- Validate every external input with zod at the boundary: HTTP bodies and query strings, MCP tool arguments, and env-dependent config.

## Tests

New non-trivial logic (money, FX, dates, ownership, branching) ships with a small `node:test` test next to it (`*.test.ts`, run with `pnpm test`). Put pure rules in files separate from the database work, so they are testable without D1.

## Errors

Use cases throw `AppError(code, status)`. `onError` in `apps/api/src/shared/http.ts` is the single place that renders an error response: `{ code, message }`, where `code` is stable and safe to branch on and `message` is already translated into the request locale. A new code needs a message key in both catalogs and an entry in `ERROR_CODES` in `apps/api/src/shared/http.ts`.

## Internationalization

- One catalog for both apps: `packages/i18n/messages/{en,es}.json`. Every user-facing string, UI and error text alike, comes from the catalog and exists in **both** files.
- Server code passes the locale explicitly, `m.key({}, { locale })`, because there is no per-request global locale.
- API locale per request: `Accept-Language` (the web client always sends its current locale) from `shared/locale.ts`; MCP uses the user's saved `locale`.
- Categories: user categories store their name; system categories (`fx_loss`, `fx_gain`, `bank_fees`) store only a key and are translated on every read. Default categories are created in the language the user picked at onboarding.
- MCP tool descriptions are English (models handle it best); the data they return is the user's own.
- Format money and dates with `Intl` in the current locale, always through `shared/money.ts` / `shared/dates.ts`.
- Switching language: `LocaleSwitch` in `features/auth`. Signed-in users persist the choice through `PATCH /api/settings`, because the signed-in shell applies the saved preference on load.

## Generated files

Change a generated file by rerunning its generator: `features/auth/auth.schema.ts` (`pnpm --filter @dqfinance/api auth:schema`), `migrations/` (`db:generate`), `worker-configuration.d.ts` (`cf-typegen`), `routeTree.gen.ts`, `packages/i18n/src/paraglide/`.

## Adding a feature

### API

1. Create `src/features/<feature>/` with `<entity>.schema.ts`, one file per use case, `<feature>.routes.ts`, and `<feature>.tools.ts`.
2. Register the schema in `src/db.ts`, the routes in `src/index.ts` (`.route('/api/<feature>', ...)`), and the tools in `src/features/mcp/mcp.routes.ts`.
3. Run `pnpm --filter @dqfinance/api db:generate`, then `db:migrate:local`. Commit the generated SQL in `migrations/`.
4. Register every new error code as described in [Errors](#errors).

### Web

1. Create `src/features/<feature>/` with `<feature>-api.ts` (TanStack Query options and hooks over `shared/api`) and its components.
2. Add a route file under `src/routes/_app/` that only composes the feature page component.
3. Shared primitives come from `#/shared/ui`. Add new ones with `pnpm dlx shadcn@latest add <name>`, run from `apps/web`.

## Pre-commit: file size

`.githooks/pre-commit` refuses a commit when a staged file exceeds **5,000 tokens** (1 token = 4 bytes, so 20,000 bytes). Two things to know:

- It measures the **staged blob**, not the working tree, so a partially staged file is judged on what will actually be committed.
- It skips what no agent authors: lockfiles, codegen (`routeTree.gen.ts`, `worker-configuration.d.ts`, `auth.schema.ts`, `migrations/`, `paraglide/`), installed skills under `.agents/skills/`, build output, binaries and media. The list is `IGNORED` in `scripts/check-file-size.mjs`; add a pattern there when a new generator appears.

After cloning without installing: `git config core.hooksPath .githooks`. On Linux and macOS the hook needs its exec bit, so add it with `git add --chmod=+x .githooks/pre-commit`.
