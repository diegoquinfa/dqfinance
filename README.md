# DQFinance

Personal finance tracker with an OAuth-protected MCP server, so AI agents can read and record your transactions.

- `apps/api` — Cloudflare Worker: Hono REST API, Better Auth (OAuth 2.1 authorization server), MCP server at `/mcp`, D1 + Drizzle.
- `apps/web` — TanStack Start app: sign-in and consent, onboarding, overview, accounts with a source detail page, movements (with CSV import), transfers, recurring, contacts, settings, and per-account documents.

Agent rules: [AGENTS.md](./AGENTS.md). Architecture: [docs/architecture.md](./docs/architecture.md). Conventions: [CODING_STANDARDS.md](./CODING_STANDARDS.md). UI rules: [DESIGN.md](./DESIGN.md).

## Run locally

```bash
pnpm install
cp apps/api/.dev.vars.example apps/api/.dev.vars   # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
pnpm db:migrate:local                              # creates the local D1 database
pnpm dev                                           # api → http://localhost:8787, web → http://localhost:3000
```

Open http://localhost:3000, create an account, and follow the setup wizard: country, language, and the currencies you use. It creates your categories and a cash wallet ("Wallet"), then you add your banks, accounts, products and cards under **Accounts**.

## Connect an agent

Point any MCP client that supports remote servers with OAuth at `http://localhost:8787/mcp`. The client registers itself, sends you to sign in and approve access, and then gets these tools:

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

1. `wrangler d1 create dqfinance` and put the id in `apps/api/wrangler.jsonc`.
2. Set `BETTER_AUTH_URL` and `WEB_URL` in `apps/api/wrangler.jsonc` to the production origins. Run `wrangler secret put BETTER_AUTH_SECRET`.
3. `pnpm --filter @dqfinance/api db:migrate:remote && pnpm --filter @dqfinance/api deploy`.
4. Build the web app with `VITE_API_URL=<api origin>`, then `pnpm --filter @dqfinance/web deploy`.

Keep the API and web on the same site (e.g. `api.example.com` and `app.example.com`) so the `SameSite=Lax` session cookie works.
