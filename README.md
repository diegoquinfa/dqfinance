# DQFinance

Personal finance tracker with an OAuth-protected MCP server, so AI agents can read and record your transactions.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/diegoquinfa/dqfinance)

One Cloudflare Worker serves both apps from one origin:

- `apps/api` — Hono REST API, Better Auth (OAuth 2.1 authorization server), MCP server at `/mcp`, D1 + Drizzle. Mounted on `/api/*`, `/.well-known/*` and `/mcp`.
- `apps/web` — the Worker itself (`src/server.ts`), a TanStack Start app: sign-in and consent, onboarding, overview, accounts with a source detail page, movements (with CSV import), transfers, recurring, contacts, settings, and per-account documents.

Agent rules: [AGENTS.md](./AGENTS.md). Architecture: [docs/architecture.md](./docs/architecture.md). Conventions: [CODING_STANDARDS.md](./CODING_STANDARDS.md). UI rules: [DESIGN.md](./DESIGN.md).

## Run locally

```bash
pnpm install
cp .dev.vars.example .dev.vars   # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
pnpm db:migrate:local            # creates the local D1 database
pnpm dev                         # http://localhost:3000
```

Open http://localhost:3000, create an account, and follow the setup wizard: country, language, and the currencies you use. It creates your categories and a cash wallet ("Wallet"), then you add your banks, accounts, products and cards under **Accounts**.

## Connect an agent

Point any MCP client that supports remote servers with OAuth at `http://localhost:3000/mcp` (or `<your origin>/mcp` once deployed). The client registers itself, sends you to sign in and approve access, and then gets these tools:

| Tool | What it does |
| --- | --- |
| `list_accounts`, `get_balance_history` | Every source with its id, balance or card debt; month-end assets and debt |
| `list_categories`, `list_contacts`, `create_contact` | Lookups needed to record something |
| `create_transaction`, `list_transactions`, `summarize_transactions` | Income and expenses, and totals for a period |
| `create_transfer`, `list_transfers`, `mark_transfer_received` | Moving your own money; card payments and in-transit transfers |
| `adjust_balance` | Set the real balance of an account, cash wallet or card |
| `list_pending_recurring`, `confirm_recurring`, `skip_recurring` | The "to confirm" inbox |
| `create_product`, `update_product`, `create_card`, `update_card` | Bank products and cards, including annual rate, brand and color |
| `import_transactions` | A whole statement at once, with a dry-run preview and duplicate detection |
| `list_documents` | The files attached to a source |

Inspect it with `npx @modelcontextprotocol/inspector`. Banks, bank accounts and cash wallets stay in the web app; products and cards are also reachable through the tools above.

## Common tasks

| Task | Command |
| --- | --- |
| Type-check, test, build everything | `pnpm check-types && pnpm test && pnpm build` |
| New migration after editing a `*.schema.ts` | `pnpm --filter @dqfinance/api db:generate` |
| Regenerate the Better Auth schema after changing plugins | `pnpm --filter @dqfinance/api auth:schema` |
| Regenerate Worker binding types after editing `wrangler.jsonc` | `pnpm --filter @dqfinance/api cf-typegen` |

## Deploy

**With the button:** it copies this repo to your GitHub account, creates the D1 database and R2 bucket, asks for `BETTER_AUTH_SECRET`, then runs `pnpm run build` and `pnpm run deploy` (migrations, then deploy). Every push to your copy deploys again.

**By hand:** `wrangler d1 create dqfinance` and put the id in `wrangler.jsonc`, `wrangler secret put BETTER_AUTH_SECRET`, then `pnpm build && pnpm run deploy`. Use `pnpm run deploy`: `pnpm deploy` is a built-in pnpm command.

**Custom domain:** add it in the dashboard (Worker → Settings → Domains & Routes). Keep `routes` out of `wrangler.jsonc`: a deploy replaces dashboard routes with the ones in the file. The auth issuer and the MCP URL follow whichever hostname a request arrives on, so there is nothing else to configure.
