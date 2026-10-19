# DQFinance — coding standards

## Naming

- Files and folders are `kebab-case`, with a suffix for the role: `.schema.ts`, `.routes.ts`, `.tools.ts`, `.test.ts`, `-api.ts`, `-page.tsx`, `-dialog.tsx`.
- Use cases are verb-first, file and function alike: `create-transaction.ts` → `createTransaction`.
- Zod input schemas are `<useCase>Input` (`createTransactionInput`); their inferred types are PascalCase (`CreateTransactionInput`).
- Database: singular `snake_case` tables (`transaction`), `snake_case` columns, `camelCase` Drizzle fields.
- MCP tools are `snake_case` verbs (`create_transaction`).

## Types and input validation

- `any` lives only in the shim `apps/web/src/shared/api-globals.d.ts`.
- Parse every external input with zod at the boundary: HTTP bodies and query strings, MCP tool arguments, and env-dependent config.

## Tests

New non-trivial logic (money, FX, dates, ownership, branching) ships with a `node:test` file beside it (`*.test.ts`, run by `pnpm test`). Keep pure rules in their own files, apart from the database work, so they test without D1.

## Errors

Use cases throw `AppError(code, status)`; `onError` in `apps/api/src/shared/http.ts` renders every error response. A new code needs a message key in both catalogs and an entry in `ERROR_CODES` in the same file.

## Internationalization

The decisions (explicit server locale, locale per request, the `{ code, message }` error shape, English tool descriptions) are in [design D13](./docs/plans/2026-10-18-finance-domain-design.md#internationalization-d13). In code:

- Every user-facing string, UI and error text alike, is a key in both `packages/i18n/messages/en.json` and `es.json`.
- The API resolves the request locale in `shared/locale.ts`.
- Format money and dates only through each app's `shared/money.ts` and `shared/dates.ts`.
- `LocaleSwitch` (`features/auth`) persists a signed-in user's choice through `PATCH /api/settings`, because the signed-in shell applies the saved preference on load.

## Generated files

Change a generated file by rerunning its generator: `features/auth/auth.schema.ts` (`pnpm --filter @dqfinance/api auth:schema`), `migrations/` (`db:generate`), `worker-configuration.d.ts` (`cf-typegen`), `routeTree.gen.ts`, `packages/i18n/src/paraglide/`.

## Adding a feature

### API

1. Create `src/features/<feature>/` with `<entity>.schema.ts` (owner column from `features/auth/owner.ts`), one file per use case, `<feature>.routes.ts`, and `<feature>.tools.ts`.
2. Register the schema in `src/db.ts`, the routes in `src/index.ts` (`.route('/api/<feature>', ...)`), and the tools in `src/features/mcp/mcp.routes.ts`.
3. Run `pnpm --filter @dqfinance/api db:generate`, then `db:migrate:local`, and commit the generated SQL in `migrations/`.
4. Register every new error code as in [Errors](#errors).

### Web

1. Create `src/features/<feature>/` with `<feature>-api.ts` (TanStack Query options and hooks over `shared/api`) and its components.
2. Add a route file under `src/routes/_app/` that only composes the feature page component.
3. Take primitives from `#/shared/ui`; add new ones with `pnpm dlx shadcn@latest add <name>`, run from `apps/web`.

## Pre-commit: file size

`.githooks/pre-commit` refuses a commit when a staged file exceeds **5,000 tokens** (1 token = 4 bytes, so 20,000 bytes).

- It measures the **staged blob**, so a partially staged file is judged on what will be committed.
- It skips what no agent authors: lockfiles, codegen, installed skills under `.agents/skills/`, build output, binaries, and media. The list is `IGNORED` in `scripts/check-file-size.mjs`; add a pattern there when a new generator appears.
- `packages/i18n/messages/*.json` is exempt: Paraglide keeps one catalog per locale, so a catalog grows with every feature and is not a file to split.

After cloning without installing: `git config core.hooksPath .githooks`. On Linux and macOS, give the hook its exec bit with `git add --chmod=+x .githooks/pre-commit`.
