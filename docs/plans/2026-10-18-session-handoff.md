# Session handoff — 2026-10-18

Read first, in this order: [AGENTS.md](../../AGENTS.md) (rules), [GLOSSARY.md](../../GLOSSARY.md) (domain nouns),
[DESIGN.md](../../DESIGN.md) (UI), [2026-10-18-finance-domain-design.md](./2026-10-18-finance-domain-design.md)
(the approved design, decisions D1–D13).

## What this is

DQFinance: a personal finance tracker whose data is also reachable by AI agents through an OAuth-protected
MCP server. Monorepo: `apps/api` (Cloudflare Worker: Hono, Better Auth as OAuth 2.1 provider, TanStack AI MCP,
D1 + Drizzle), `apps/web` (TanStack Start), `packages/i18n` (English and Spanish catalog shared by both).

## State

- Branch `main`, **no remote configured**. 7 commits: `2404c1b` (create-turbo scaffold) then
  `685cf62` hook, `696fd3f` monorepo layout, `7919be8` i18n, `21b4909` api, `bf957a3` web, `9e0640a` docs.
- Working tree clean. 214 files tracked. This handoff file is the only untracked addition.
- Verified on the committed tree: `pnpm check-types` 4/4, `pnpm test` (18 API `node:test` + 5 hook tests),
  `pnpm build` 3/3 (api dry-run, web vite build, i18n paraglide).
- Implemented and exercised end to end: onboarding, accounts (bank → account → product → cards, cash),
  categories, contacts, transactions (incl. a credit-card charge in a foreign currency), transfers
  (own, card payment with FX difference, in transit → mark received), balance adjustments,
  recurring expenses with the "to confirm" inbox, and all 13 MCP tools over a real OAuth token.
- Not done: deploy, and everything listed under "Next".

## Run it

```bash
pnpm install                                  # sets core.hooksPath via `prepare`
cp apps/api/.dev.vars.example apps/api/.dev.vars   # then put a real BETTER_AUTH_SECRET (openssl rand -base64 32)
pnpm db:migrate:local                         # creates the local D1 database
pnpm dev                                      # api on :8787, web on :3000
```

Ports: api 8787, web 3000. `BETTER_AUTH_URL` and `WEB_URL` in `apps/api/wrangler.jsonc` must match them, or
OAuth redirects and CORS break (`WEB_URL` is the only allowed CORS origin). MCP inspector:
`npx @modelcontextprotocol/inspector` pointed at `http://localhost:8787/mcp`.

## Architecture in one breath

Vertical slices under `features/` on both sides; nothing about a feature lives outside it except the
registration lines in the composition roots (`apps/api/src/index.ts`, `db.ts`, `features/mcp/mcp.routes.ts`,
`apps/web/src/routes/`). A feature may only import features **earlier** in this order, never later, never in a
cycle:

```
settings → accounts → categories → counterparties → transactions → transfers → balances
         → balance-adjustments → recurring-expenses
```

Two modules exist so the risky rules live once: `accounts/source.ts` (where money is: ownership, currency, the
three-nullable-FK shape with a CHECK for exactly one) and `balances/compute-balances.ts` (every balance, debt,
cost basis and in-transit rule; pure, so it is tested without a database). Anything two features need that is
not a domain noun goes to `shared/`.

## Decisions not to re-litigate

Design D1–D13 in the plan document. The ones most likely to be questioned:

- **Balances are computed, never stored.** "Edit balance" inserts a `balance_adjustment`, movements are never
  rewritten. Transfers and adjustments are neither income nor expense.
- **Money is integer cents** (`*_cents`), always positive, `type` carries the sign. ISO minor units are wrong
  here: ICU reports 0 fraction digits for COP, so they would drop the cents.
- **A credit card has its own debt per currency**; a debit card spends from its product. A foreign charge also
  stores its value in the card's currency on the purchase day, and paying that debt books the FX difference as
  a real expense or income. `transfer.sent_amount_cents` excludes the fee and the FX difference; both are
  linked transactions on the origin, so the origin loses exactly what was paid.
- **Transfer types are derived**, never stored.
- **Recurring expenses never create movements on their own**; they wait in the inbox for confirm or skip.
- **DCR instead of CIMD** (`@better-auth/cimd` ships only a Node transport). Revisit when a Workers-safe
  `fetchClientMetadataResource` exists.
- **Bank catalog only for Colombia**, as a suggestion; anywhere else the user types the name. The app is global.
- **MCP tool descriptions are English**; the data they return is the user's own.

## Traps already hit (do not rediscover)

- Never cache the Better Auth instance per isolate: it starts D1 I/O on init and a Worker hangs when a request
  awaits I/O from another request. `createAuth` runs per request.
- One zod version (`^4.6.7`). Two copies crash workerd with `ZodLazy2 is not a constructor`.
- Keep `"ui": "stream"` in `turbo.json`: under the Windows TUI, `wrangler dev` binds its port and then stops
  answering every request.
- A React Query guard must not decide on cached data while a refetch is in flight, or finishing onboarding
  bounces the user back (`status: success`, `fetchStatus: fetching`, data still `null`). Check
  `!isPending && !isFetching`.
- The language has to persist in the server (`PATCH /api/settings`) when the signed-in shell also applies the
  saved preference, or the cookie and the preference fight and reload in a loop.
- Native dropdown rows are painted by the browser, and on Windows with the **system** theme: `styles.css` sets
  `color-scheme` per theme and explicit `option`/`optgroup` colors. Do not remove those rules.
- In type positions, an index access cannot be followed by a dot:
  `InferRequestType<typeof api.api.accounts['bank-accounts']['$post']>`.
- A form control whose `name` equals its `id` silently breaks `new FormData(form).get(...)`.
- Hooks reach git through `core.hooksPath`; a hook with CRLF fails in `sh`, so `.gitattributes` pins LF.
- Launching a browser with an unquoted URL on Windows cuts it at the first `&` (this broke an MCP client's
  authorization attempt; the server correctly answered `invalid_request / client_id is required`).

## Next, in order

1. **Editing and deleting records.** Today the API and MCP only create and list. Removing a wrong transaction,
   category, contact, account or adjustment is impossible without a database edit or another adjustment. This is
   the biggest gap: an agent will eventually write something wrong. Add `update_*` / `delete_*` use cases, the
   routes, the tools and the web affordances.
2. **Loans and debts.** Money lent to a person is recorded as an expense today, so a loan inflates spending and
   its repayment inflates income. The user has a real case: 5.000 COP lent to "José". `Counterparty` already
   carries the link.
3. Deploy: `wrangler d1 create dqfinance` and put the id in `apps/api/wrangler.jsonc`, set the production
   `BETTER_AUTH_URL`/`WEB_URL`, `wrangler secret put BETTER_AUTH_SECRET`, `db:migrate:remote`, then
   `VITE_API_URL=<api origin> pnpm --filter @dqfinance/web build`. Unverified in production: `requireMcpAuth`
   fetches JWKS over HTTP from its own base URL, and the session cookie needs both apps on the same site
   (SameSite=Lax between subdomains of one registrable domain).
4. Decide whether the installed skills in `.agents/` should stay versioned (they are, 30-odd files, some huge).
5. Later list from the design: budgets, receipts/attachments, savings goals, tags, statements/periods,
   exchange rates (automatic purchase-day value), investments.
6. Known limits to fix when they matter: no FX difference when paying foreign card debt from a third currency;
   balances are summed in memory (fine up to tens of thousands of movements per user); the onboarding country
   is used only for the Colombian bank catalog; accounts, products and cards cannot be edited or deleted.

## Verifying a change

```bash
pnpm check-types && pnpm test && pnpm build     # from the root, all three must pass
```

Throwaway end-to-end scripts (outside the repo, safe to delete): `%LOCALAPPDATA%\Temp\dqf-e2e\domain.mjs`
(API + OAuth + all MCP tools; pass the API origin as argv[2]) and `ui.mjs` (browser: guard, sign-up,
onboarding, accounts, movements, transfers, contacts, recurring, adjustment, overview, language switch, dark
mode; pass the playwright-core path and a screenshots dir). They drive Edge through
`%LOCALAPPDATA%\Temp\dqf-pw`. Start the api with
`npx wrangler dev --port 8788 --var BETTER_AUTH_URL:http://localhost:8788 --var WEB_URL:http://localhost:3001`
and the web with `VITE_API_URL=http://localhost:8788 npx vite dev --port 3001` so the user's own dev session
on 8787/3000 keeps running.

## How the user works

Converses in Spanish, wants repository artifacts in English. Uses the `ponytail` skill: the smallest change
that fully solves the task, no dependencies for a few lines. Wants the app to work anywhere in the world with
extra affordances for Colombia, never Colombia-first assumptions. Prefers corrections that do not rewrite
history (balance adjustments over editing balances). Expects ambiguity to be asked about, not guessed: on two
writes in this session the source and the category were confirmed with one question each before writing.
