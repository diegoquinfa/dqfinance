# DQFinance — MCP server

The tools are listed under [Tools](#tools); the flow, the roles and the rules for writing one follow.

## Flow

```
MCP client (Claude, Cursor, …)
   │ 1. POST /mcp without a token → 401 + WWW-Authenticate: resource_metadata=…/.well-known/oauth-protected-resource/mcp
   │ 2. discovers the authorization server (/.well-known/oauth-authorization-server/api/auth)
   │ 3. registers itself (DCR: /api/auth/oauth2/register)
   │ 4. authorization code + PKCE → user signs in at <origin>/sign-in, approves at <origin>/consent
   │ 5. receives a JWT access token, audience-bound to <origin>/mcp
   ▼
apps/api  /mcp
   requireMcpAuth (Better Auth)   verifies signature (JWKS), issuer, audience, expiry, required scopes
        │ claims.sub = userId
   mcpServer.handle(request, { context: { db, userId, locale } })   (TanStack AI MCP, stateless)
        │
   transactions.tools.ts → createTransaction(ctx.context.db, ctx.context.userId, input)
```

## Roles

- **Better Auth** (`@better-auth/mcp`) is the OAuth 2.1 authorization server: discovery, DCR, authorize, token, JWKS, and token verification.
- **TanStack AI** (`@tanstack/ai-mcp/server`) is only the MCP protocol layer and never sees raw tokens.

## Guests

A **guest** is a user with no email the person owns: it explores the app, but it never hands its
ledger to an agent. Two layers keep it away from the tools:

1. **No token is issued.** The authorization endpoint refuses an anonymous session, so the agent
   never gets an access token. The refusal is a plain `403` (`GUEST_MCP_DENIED`) and not a scope
   challenge: a guest cannot fix it by granting a scope, and a challenge would send the agent
   through consent again for nothing. The rule lives in `auth.ts` (`AUTHORIZE_PATH`).
2. **`/mcp` refuses it anyway.** Every request looks up the user behind the token's `sub` and
   answers `403` when the user is anonymous or gone (`mcp/guest-rule.ts`). This also covers a
   token issued before the guest signed up, whose `sub` points to a user that no longer exists.

The consent page refuses too, so the agent's author sees why instead of a mystery `403`.

## Writing a tool

- Read the user from `ctx.context.userId` (type `McpContext`).
- `/mcp` requires every scope in `MCP_SCOPES`.
- Mark read-only tools with `metadata.annotations.readOnlyHint`.
- Wrap a returned list in an object, so the response is a JSON object with `structuredContent`.
- **A description is a fixed cost.** Every client pays for the whole `tools/list` payload the moment
  it connects, so a tool description says in one sentence what the tool does, and a field
  description says only what the schema cannot: not the type, not the name, not a fact the schema
  already carries (`exclusiveMinimum`, `multipleOf`, `maxItems`, `enum`). Keep the facts a model
  needs to call correctly: amounts are decimal and not cents, dates are `YYYY-MM-DD` or an ISO 8601
  datetime, an amount is positive and the type carries the sign, which id comes from which list
  tool, a dry run before an import, and a confirmation before a delete.
- The `tools/list` payload is **a fixed cost that grows with every tool** (it was 22,647 chars at
  36 tools; the server now publishes **55**). Measure it by bundling a script that
  builds `createMCPServer` with the real tool arrays (the esbuild next to wrangler, with
  `NODE_PATH=apps/api/node_modules`), then asking the server for `tools/list`: the sources use
  extensionless imports, so plain Node cannot load them.

## Gotchas

- **Origin:** `<origin>` is the request's, passed to `createAuth` and `mcpResource`. Each hostname the Worker answers on is its own issuer, so a token from one does not work on another.
- **Workers:** create the auth instance per request with `createAuth`, never at module scope. Better Auth starts D1 I/O on init, and a Worker hangs when a request awaits I/O that belongs to another request.
- **DCR is a shortcut:** `@better-auth/cimd` ships only a Node transport. Switch to `cimd()` once there is a Workers-safe `fetchClientMetadataResource`.

## Importing a statement

`import_transactions` takes one source and up to 500 rows. The tool description asks the agent to parse the PDF or screenshot itself, call with `dryRun: true`, show the preview, and only then call again with `dryRun: false`; the write is one atomic `db.batch` of 8-row INSERTs (D1 allows 100 bound parameters per statement). A row is a duplicate when it matches a recorded movement on the same source, type, amount in cents and calendar day (the user's timezone), and a title or a description that both of them carry matches. A row that only looks like one is imported and flagged `possibleDuplicate`. The rule is `features/transactions/duplicate.ts` (pure, tested).

## Tools

| Tool | Purpose |
| --- | --- |
| `get_settings` | The user's country, language, timezone and enabled currencies; read-only |
| `list_accounts` | Every source with its id, currency, and balance or debt |
| `get_balance_history` | Month-end assets and card debt per currency, optionally for one source |
| `create_bank`, `create_bank_account`, `create_cash_wallet` | A bank and an account in it, or a cash wallet, so an agent can set up a source end to end |
| `create_product`, `update_product`, `create_card`, `update_card` | The setup fields an agent needs, including the annual rate, the yield payout, the parent product of a pocket, brand, interest rate, and color |
| `list_categories`, `create_category`, `update_category`, `delete_category`, `merge_categories` | Categories to record movements with, and reshaping them: rename and mark, delete an unused one, or merge one into another of the same kind; `includeSystem` adds the FX-difference and fee ones |
| `list_contacts`, `get_contact`, `create_contact`, `update_contact`, `delete_contact` | Contacts, and one contact's totals by category and month |
| `create_transaction`, `list_transactions`, `summarize_transactions` | Record, query and total income and expenses |
| `search_transactions` | Find a movement by its title, description or category, one line each, newest first |
| `update_transaction`, `delete_transaction` | Correct or remove a movement; the fee and FX entries of a transfer belong to it and cannot change on their own |
| `create_transfer`, `list_transfers`, `mark_transfer_received` | Move money between the user's own sources |
| `adjust_balance`, `list_balance_adjustments` | Set the real balance of a source; the last 100 corrections |
| `list_recurring`, `create_recurring`, `delete_recurring` | Manage subscriptions and bills; `pending: true` is the "to confirm" inbox |
| `confirm_recurring`, `skip_recurring` | Work the "to confirm" inbox |
| `get_calendar` | Per day of the user's timezone, what moved and what falls due (up to 62 days) |
| `import_transactions` | Record a whole statement at once, with a dry-run preview and duplicate detection |
| `list_documents`, `delete_document` | The files attached to the user's sources, and removing one |
| `list_expected_incomes`, `create_expected_income`, `delete_expected_income` | The money the user expects, and the day each one next arrives; safe to spend counts on them |
| `list_savings_goals`, `create_savings_goal`, `add_savings_contribution`, `delete_savings_goal` | What the user is saving for, what was put in, and what each goal asks every month |
| `safe_to_spend`, `forecast` | How much may be spent today, with each credit card's cycle and statement; and the projected balance of each day until the month ends, with its lowest point |
| `record_card_statement` | What a credit card's statement asks the user to pay after a cut (D16) |
| `list_webhooks`, `create_webhook`, `delete_webhook` | The user's own automation: the public https URL the app calls when a bill falls due, and the secret its signature uses |
| `list_budgets`, `set_budget`, `delete_budget` | A monthly limit per category, with what it spent and what is left |

Onboarding, changing settings, and uploading or downloading files stay in the web app; every other write is also reachable through the tools above. Scopes: `finance:read`, `finance:write`.
