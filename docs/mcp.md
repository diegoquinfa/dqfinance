# DQFinance — MCP server

The tool set, and the setup that stays web-only, are in [the domain design](./plans/2026-10-18-finance-domain-design.md#mcp-tools).

## Flow

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

## Roles

- **Better Auth** (`@better-auth/mcp`) is the OAuth 2.1 authorization server: discovery, DCR, authorize, token, JWKS, and token verification.
- **TanStack AI** (`@tanstack/ai-mcp/server`) is only the MCP protocol layer and never sees raw tokens.

## Writing a tool

- Read the user from `ctx.context.userId` (type `McpContext`).
- `/mcp` requires every scope in `MCP_SCOPES`.
- Mark read-only tools with `metadata.annotations.readOnlyHint`.
- Wrap a returned list in an object, so the response is a JSON object with `structuredContent`.

## Gotchas

- **Workers:** create the auth instance per request with `createAuth`, never at module scope. Better Auth starts D1 I/O on init, and a Worker hangs when a request awaits I/O that belongs to another request.
- **DCR is a shortcut:** `@better-auth/cimd` ships only a Node transport. Switch to `cimd()` once there is a Workers-safe `fetchClientMetadataResource`.

## Importing a statement

`import_transactions` takes one source and up to 500 rows. The tool description asks the agent to parse the PDF or screenshot itself, call with `dryRun: true`, show the preview, and only then call again with `dryRun: false`; the write is one multi-row INSERT. A row is a duplicate when the source, type, amount in cents, calendar day and (when both have one) description already exist. The rule is `features/transactions/duplicate.ts` (pure, tested).
