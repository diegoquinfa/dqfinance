# DQFinance

Personal finance tracker with an OAuth-protected MCP server, so AI agents can read and record your transactions.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/diegoquinfa/dqfinance)

One Cloudflare Worker serves both apps from one origin:

- `apps/api` — Hono REST API, Better Auth (OAuth 2.1 authorization server), MCP server at `/mcp`, D1 + Drizzle. Mounted on `/api/*`, `/.well-known/*` and `/mcp`.
- `apps/web` — the Worker itself (`src/server.ts`), a TanStack Start app: the landing page, sign-in and consent, onboarding, overview, accounts with a source detail page, movements (with CSV import), transfers, recurring, contacts, settings, and per-account documents.

Agent rules: [AGENTS.md](./AGENTS.md). Architecture: [docs/architecture.md](./docs/architecture.md). Conventions: [CODING_STANDARDS.md](./CODING_STANDARDS.md). UI rules: [DESIGN.md](./DESIGN.md).

## Run locally

```bash
pnpm install
cp .dev.vars.example .dev.vars   # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
pnpm db:migrate:local            # creates the local D1 database
pnpm dev                         # http://localhost:3000
```

Open http://localhost:3000, create an account, and follow the setup wizard: country, language, and the currencies you use. It creates your categories and a cash wallet ("Wallet"), then you add your banks, accounts, products and cards under **Accounts**.

Without an account you can try the app: the landing page's **Try the demo** signs you in as a guest and fills it with six months of sample data. A guest cannot connect an AI agent over MCP, and keeps what it recorded when it signs up for real.

## Connect an agent

Point any MCP client that supports remote servers with OAuth at `http://localhost:3000/mcp` (or `<your origin>/mcp` once deployed). The client registers itself, sends you to sign in and approve access, and then gets these tools:

| Tool | What it does |
| --- | --- |
| `get_settings` | Country, language, timezone and enabled currencies (read-only) |
| `list_accounts`, `get_balance_history` | Every source with its id, balance or card debt; month-end assets and debt |
| `create_bank`, `create_bank_account`, `create_cash_wallet` | Banks, their accounts, and cash wallets, so an agent can set up a source end to end |
| `create_product`, `update_product`, `create_card`, `update_card` | Bank products and cards, including annual rate, brand and color |
| `list_categories`, `create_category` | Categories, including the system ones on request |
| `list_contacts`, `get_contact`, `create_contact`, `update_contact`, `delete_contact` | People and businesses, and where the money with one went |
| `create_transaction`, `list_transactions`, `summarize_transactions`, `update_transaction`, `delete_transaction` | Income and expenses, and totals for a period |
| `import_transactions` | A whole statement at once, with a dry-run preview and duplicate detection |
| `create_transfer`, `list_transfers`, `mark_transfer_received` | Moving your own money; card payments and in-transit transfers |
| `adjust_balance`, `list_balance_adjustments` | Set the real balance of a source, and the corrections made so far |
| `list_recurring`, `create_recurring`, `delete_recurring`, `confirm_recurring`, `skip_recurring` | Subscriptions and bills, and the "to confirm" inbox |
| `get_calendar` | Day by day: what moved and what falls due |
| `list_documents`, `delete_document` | The files attached to a source |

Inspect it with `npx @modelcontextprotocol/inspector`. Uploading and downloading files, onboarding, and changing settings stay in the web app.

## Common tasks

| Task | Command |
| --- | --- |
| Type-check, test, build everything | `pnpm check-types && pnpm test && pnpm build` |
| New migration after editing a `*.schema.ts` | `pnpm --filter @dqfinance/api db:generate` |
| Regenerate the Better Auth schema after changing plugins | `pnpm --filter @dqfinance/api auth:schema` |
| Regenerate Worker binding types after editing `wrangler.jsonc` | `pnpm --filter @dqfinance/api cf-typegen` |

## Deploy

**With the button:** it copies this repo to your GitHub account, creates the D1 database and R2 bucket, asks for `BETTER_AUTH_SECRET`, then runs `pnpm run build` and `pnpm run deploy` (migrations, then deploy). Every push to your copy deploys again.

**By hand:** `wrangler d1 create dqfinance-db` (no id to copy: wrangler finds the database by name), `wrangler secret put BETTER_AUTH_SECRET`, then `pnpm build && pnpm run deploy`. Use `pnpm run deploy`: `pnpm deploy` is a built-in pnpm command.

**Email (optional):** only the password-reset email exists. Each deployment picks its provider with its own secrets (`wrangler secret put`, or `.dev.vars` locally). With none, the "forgot password" link is hidden and everything else works.

| Provider | Secrets, plus `EMAIL_FROM` (for example `DQFinance <no-reply@example.com>`) |
| --- | --- |
| Cloudflare Email Service | the `EMAIL` binding (already in `wrangler.jsonc`): only `EMAIL_FROM`; or REST with `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` |
| Resend | `RESEND_API_KEY` |
| Any SMTP server | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_PORT` (default 465) |

`EMAIL_PROVIDER=cloudflare|resend|smtp` forces one; without it the first complete configuration wins, in this order: Resend, SMTP, Cloudflare REST, then the `EMAIL` binding. An incomplete one turns email off rather than failing.

- **Cloudflare:** the domain must use Cloudflare DNS, sending to any recipient needs Workers Paid, and the domain must be onboarded under *Email Service → Email Sending* (it adds the SPF and DKIM records). The API token (REST only) needs only *Email Sending: Edit*. Email Sending is in beta.
- **Resend:** verify the `EMAIL_FROM` domain in Resend.
- **SMTP:** port 465 (implicit TLS) or 587 (STARTTLS); Workers cannot open port 25. Authentication is `AUTH PLAIN`, one recipient per message.

**Custom domain:** add it in the dashboard (Worker → Settings → Domains & Routes). Keep `routes` out of `wrangler.jsonc`: a deploy replaces dashboard routes with the ones in the file. The auth issuer and the MCP URL follow whichever hostname a request arrives on, so there is nothing else to configure.

## License

[Apache License 2.0](./LICENSE). You may use, change and sell it; a copy you redistribute keeps the license and the [NOTICE](./NOTICE). The name and the logo are not part of the license.
