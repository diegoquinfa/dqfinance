# DQFinance — MCP server

The tool set, and the setup that stays web-only, are in [the domain design](./plans/2026-10-18-finance-domain-design.md#mcp-tools).

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
- The `tools/list` payload is **22,647 chars** (36 tools). Measure it by bundling a script that
  builds `createMCPServer` with the real tool arrays (the esbuild next to wrangler, with
  `NODE_PATH=apps/api/node_modules`), then asking the server for `tools/list`: the sources use
  extensionless imports, so plain Node cannot load them.

## Gotchas

- **Origin:** `<origin>` is the request's, passed to `createAuth` and `mcpResource`. Each hostname the Worker answers on is its own issuer, so a token from one does not work on another.
- **Workers:** create the auth instance per request with `createAuth`, never at module scope. Better Auth starts D1 I/O on init, and a Worker hangs when a request awaits I/O that belongs to another request.
- **DCR is a shortcut:** `@better-auth/cimd` ships only a Node transport. Switch to `cimd()` once there is a Workers-safe `fetchClientMetadataResource`.

## Importing a statement

`import_transactions` takes one source and up to 500 rows. The tool description asks the agent to parse the PDF or screenshot itself, call with `dryRun: true`, show the preview, and only then call again with `dryRun: false`; the write is one multi-row INSERT. A row is a duplicate when the source, type, amount in cents, calendar day and (when both have one) title already exist. The rule is `features/transactions/duplicate.ts` (pure, tested).
