# Session handoff — 2026-10-20: one Worker, MCP parity, and the email design brief

Read first: [AGENTS.md](../../AGENTS.md), [docs/architecture.md](../architecture.md), [docs/mcp.md](../mcp.md),
and the [domain design](./2026-10-18-finance-domain-design.md) (D1–D13, MCP tools table).

The next session designs **transactional email** (forgot-password first). Its brief is at the end; the rest is
what changed in this session and what not to re-learn.

## State

- `main` is pushed to `github.com/diegoquinfa/dqfinance` (public). Last commits: `d6ac67d` one Worker + Deploy
  button, `01366e0` MCP parity + in-process JWKS, `80c5c45` change password, `7f358f6` date schemas.
- **One uncommitted change, on purpose:** `wrangler.jsonc` holds the real D1 id (`dqfinance-db`,
  `63dd1828-…`). Undecided whether to commit it or keep the zero placeholder for Deploy-button users (it is
  not verified what the button does with another account's id). Do not commit it by accident.
- `pnpm check-types && pnpm test && pnpm build` passes (100 app tests + 5 hook tests).

## Production

- Worker `dqfinance` on account `diegoquinfa@proton.me` (`b9c67f4c…`), served at
  `https://dqfinance.diegoquinfa.dev` (custom domain added in the dashboard; `workers.dev` is off).
- D1 `dqfinance-db`, R2 `dqfinance-documents`. Secrets: `BETTER_AUTH_SECRET`, `VAPID_PUBLIC_KEY`,
  `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:contact@diegoquinfa.dev`).
- A second, independent instance exists from the Deploy button on another account; this session did not touch it.
- Deploy from here: `pnpm build`, then from `apps/web`:
  `wrangler d1 migrations apply DB --remote -c ../../wrangler.jsonc` and
  `wrangler deploy -c dist/server/wrangler.json` (add `--secrets-file <env file>` to upload secrets in the same deploy).
- Logs: `wrangler tail dqfinance --format json` from `apps/web`.

## What changed in this session

- **One Worker.** `apps/web/src/server.ts` sends `/api/*`, `/.well-known/*` and `/mcp` to the Hono app and the
  rest to TanStack Start. `apps/api` is a library. Auth issuer, MCP resource and sign-in pages come from the
  request origin; `WEB_URL`, `BETTER_AUTH_URL`, `VITE_API_URL` and CORS are gone. `wrangler.jsonc` and
  `.dev.vars` live at the repo root. Local dev: `pnpm dev` → `http://localhost:3000` (MCP at `/mcp`).
- **Deploy to Cloudflare button** in the README; confirmed working by the user.
- **MCP:** 36 tools, parity with the REST API except onboarding, settings changes, file upload/download and
  push (web-only by design; the domain design table is updated). `list_pending_recurring` became
  `list_recurring` with a `pending` flag.
- **Change password** in Settings (`authClient.changePassword`, revokes other sessions; agents' OAuth tokens survive).
- **MCP context cost:** `tools/list` went from 28,451 to 23,965 chars by publishing ISO dates as `format` only.

## Gotchas learned (do not rediscover)

- **A Worker cannot fetch its own hostname.** `requireMcpAuth` fetched `${baseURL}/jwks` and every
  authenticated MCP call failed with `Jwks failed: <none>`. Fixed in `mcp.routes.ts` by passing a loader
  (`auth.api.getJwks()`) as `jwksUrl`. Any new code that calls this Worker over HTTP from inside it fails the same way.
- **Smoke tests must include an authenticated MCP call**; a 401 on `/mcp` without a token proves nothing.
- Wrangler ignores the Vite-generated redirect config when the user config is in another directory: always
  pass `-c` explicitly (see the deploy commands above).
- The Vite plugin keeps local D1 under `apps/web/.wrangler/state` and reads `.dev.vars` from the config's
  directory; with `secrets` declared it loads only declared secrets.
- `apps/web/turbo.json` adds `$TURBO_ROOT$` inputs: Turborepo would not rebuild web when only `apps/api` changed.
- Every object a tool returns goes out twice (`content` text + `structuredContent`, `@tanstack/ai-mcp`
  `tasks.js:106`). Not changed; which copy each client feeds the model is unverified.
- Measuring `tools/list`: bundle a script that builds `createMCPServer` with the real tool arrays using the
  esbuild next to wrangler (`NODE_PATH=apps/api/node_modules`); sources use extensionless imports, so plain Node cannot load them.

## Incident this session

The owner mistyped their password at sign-up and there was no way to change or reset it. Recovered by hashing
a random temporary password with `better-auth/crypto` `hashPassword` (verified with `verifyPassword`) and
updating only the `account` row with `provider_id = 'credential'` through
`wrangler d1 execute DB --remote --file`. That manual path is the only recovery today; the email work below removes it.

## Next: design transactional email

Goal: "forgot password" from the sign-in page, and possibly email verification. Use the brainstorming flow
(one question at a time) and write the result to `docs/plans/<date>-email-design.md`.

### Constraints

- **Optional per deployment**, like the VAPID keys: a Deploy-button user with no email provider still gets a
  working app, and the "forgot password" link is hidden or explains it is unavailable. Declare the new secrets
  in `.dev.vars.example` and describe them under `cloudflare.bindings` in the root `package.json`.
- Runs on Workers: an HTTP API or a Cloudflare binding, not a Node SMTP library.
- Every user-facing string, email bodies included, is in both catalogs (`packages/i18n`). The user's locale is
  in `user_settings.locale`, which does not exist before onboarding: fall back to `Accept-Language`.
- Same origin: links in emails use the request origin, like the auth issuer does.
- Do not reveal whether an address has an account.

### What Better Auth gives (1.7.10, verify the exact signatures)

- `emailAndPassword.sendResetPassword({ user, url, token })`, called by `/request-password-reset`
  (`better-auth/dist/api/routes/password.mjs:20-82`, through `runInBackgroundOrAwait`; check how that behaves
  on Workers and whether it needs `ctx.waitUntil`). Also `resetPasswordTokenExpiresIn` and `onPasswordReset`.
- `emailVerification.sendVerificationEmail` and `requireEmailVerification`, if verification is in scope.
- Client: a request-reset call and a reset call with the token; confirm their names in the installed version.
- `createAuth` is built per request in `apps/api/src/features/auth/auth.ts`; the sender needs `env`, so it
  belongs there.

### Decisions for the design session

1. **Provider.** Candidates: Cloudflare's own email sending (the wrangler token has an `email_sending` scope;
   verify what it is, whether it is GA, and whether it can send to any recipient rather than only verified
   addresses), Resend, Postmark, Amazon SES over HTTP. Compare free tier, setup steps for a button user, and
   DNS needs (SPF/DKIM on `diegoquinfa.dev`).
2. **Scope.** Forgot-password only, or also email verification (and then: required or not, and what happens
   to existing unverified users).
3. **Web screens.** `/forgot-password` and `/reset-password` routes (`ssr: false`, like `/sign-in`), and the
   link from the sign-in form.
4. **Rate limiting.** Better Auth's default limiter is in memory, which on Workers is per isolate. Decide
   whether reset requests need a D1-backed limit.
5. **Templates.** Plain text, or plain text + minimal HTML, rendered from the i18n catalog.

### Verification to plan for

A real reset end to end against a deployed instance (request → email arrives → link → new password → sign
in), the "no provider configured" path, and an unknown address getting the same response as a known one.

## Also pending

- Decide `wrangler.jsonc` (see State).
- Try the change-password form in a browser; only the endpoint was exercised.
- MCP context ideas not done (the user only cared about the fixed cost): smaller read payloads, shorter
  `.describe()` texts, and the duplicated `structuredContent`.
