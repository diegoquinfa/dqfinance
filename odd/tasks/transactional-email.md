# Transactional email, sign-up, and leftover follow-ups

## Objective

Send the password-reset email through whichever provider a deployment configures (Cloudflare Email Service, Resend, or SMTP), add a dedicated sign-up page with a repeated password checked on the client and the server, and close the one leftover follow-up that is still a real bug (bank-fees matched by translated name).

## Problem

There is no way to recover a mistyped sign-up password except a manual D1 update. Sign-up is a mode on `/sign-in` with a single password field and no server check that the two copies match. A Deploy-button install must keep working with no email provider.

## Why

The 2026-10-20 incident had no reset path. The user asked for Cloudflare, Resend, and SMTP, a dedicated registration page, and a repeated password on both sides. They also asked to finish improvements from recent sessions that are still missing, without blocking questions.

## Scope

- Optional sender: Cloudflare (Workers `send_email` binding, else REST), Resend HTTP, generic SMTP over `cloudflare:sockets`.
- Forgot-password and reset-password pages. Same response whether the address exists.
- Dedicated `/sign-up`. Sign-in stays sign-in. Confirm password on sign-up and on change-password.
- `list_categories` exposes `systemKey`; the web matches bank fees by that key.

## Out of scope

- Required email verification (would lock existing users).
- A new D1 rate-limit table. Better Auth's in-memory limiter stays. shortcut: per-isolate only, upgrade if reset spam shows up.
- Multi-ledger profiles (domain decision).
- Foreign-currency import rows, document MCP upload/download (web-only by design), calendar week/heatmap/projected balance.
- Balance-history timezone (no timezone is stored; a new setting is a product decision, not done).
- Committing `wrangler.jsonc` (real D1 id, left dirty on purpose).
- Push, PR, deploy.

## Constraints

- Money and ownership invariants unchanged.
- User-facing strings, including email bodies, in `packages/i18n` en and es.
- Links use the request origin. Do not reveal whether an address has an account.
- No new dependency. SMTP is a small client behind an injected socket.
- Do not edit `wrangler.jsonc`.
- Workers never commit.

## TDD

Off. Source: AGENTS.md requires `pnpm test` but does not enable strict red-green TDD; no session flag. Runner: `node --test` in the touched package, then `pnpm check-types && pnpm test && pnpm build` at closure.

## Delivery

Feature branch `feat/transactional-email`. Strategy `exception-ok`: the user forbade push, PRs, and any prompt that would block an unattended run. Commits stay local. Forecast is over ~400 authored lines because three providers plus four pages cannot be sliced smaller without a non-working unit. No chain will be opened.

## Decisions (assumed; user is unavailable)

1. One active provider. `EMAIL_PROVIDER` = `cloudflare` | `resend` | `smtp` when set. Otherwise the first complete config wins: Cloudflare binding, else Resend key, else SMTP host, else Cloudflare REST token. None means email is off.
2. Cloudflare prefers `env.EMAIL.send` when the binding exists. REST (`CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN`, `POST /accounts/{id}/email/sending/send`) is the path that does not require a wrangler binding, so the Deploy button still works.
3. SMTP: implicit TLS on 465 (`secureTransport: "on"`). Port 587 uses STARTTLS. AUTH PLAIN. One recipient. Text + HTML alternative.
4. `EMAIL_FROM` is required for every provider. Missing pieces mean the sender is off, not a thrown boot error.
5. Password rule stays min 8. Confirm must be present and equal on sign-up and change-password. No extra complexity rules.
6. Reset token expiry 1 hour. Email is plain text plus a one-paragraph HTML body from the catalog. Locale from `Accept-Language` (no settings row before onboarding; reset may also have no easy settings read).

## Tasks

- [x] T1 Design note in `docs/plans/2026-10-20-email-design.md`. Route: inline. Trigger: one known file. Commit `16e5a98`.
- [x] T2 Email transport + tests. Route: delegated writer. Trigger: multi-file write. Commit `5affbca`. Independent verify found 4 SMTP defects (251/252, UTF-8 AUTH, untrimmed secrets, non-ASCII headers); fixed and re-verified, 19/19 tests.
- [x] T3 Wire reset into Better Auth, public enabled flag, i18n bodies, server-side confirm password on sign-up, change-password and reset. Route: delegated writer. Commit `287e0cc` (with T4: the server check would break the old sign-up form alone).
- [x] T4 `/sign-up`, `/forgot-password`, `/reset-password`, confirm password. Route: delegated writer. Commit `287e0cc`; react-doctor fixes `f0ff079`. Parent fix: forgot-password shows real errors (network, 429); only success is uniform. Independent verify: no blocking defects. Gate green.
- [x] T5 Expose `systemKey` and match bank fees by it. Route: delegated writer. Commit `6739152`. `system` replaced (one caller), payload size flat.
- [x] T5b Shrink MCP `tools/list` (fixed context cost the user cares about) by shortening descriptions, without dropping units or formats. Route: delegated writer. Commit `447ed5a`: 23,975 → 22,647 chars. First attempt rejected and reverted: a publish-time description overlay module (duplicated text, casts) for the same 6%. Rationale: handoff 2026-10-20 "MCP context ideas not done"; only the fixed cost matters to the user.
- [x] T6 Deletion-test pass (`codebase-design`). Route: two read-only explorers (API, web), then one writer. Commit `f60500b`: +45/−105. Deleted or inlined: cardProduct re-export, findOwnedDocument, toCategory (+ its test), BankNameInput, allSources, currencyName, isLocale; un-exported escapeHtml, calendarDay, countryLabel, currencyCodes. Kept on purpose: smtp-sockets adapter (code would move, not vanish), expiredPushStatus (pure-rule-in-own-file standard), CalendarPeriod (low confidence), vendored shared/ui primitives (FieldLegend, FieldSet, Toggle, SelectSeparator unused but vendored).

## Checks

Focused `node --test` per unit. Closure: `pnpm check-types && pnpm test && pnpm build`.

## Progress

Branch `feat/transactional-email`. T1 `16e5a98`, T2 `5affbca`, T3+T4 `287e0cc`, `f0ff079`, T5 `6739152`, T5b `447ed5a`, T6 `f60500b`. Not run: browser pass and a real email send (needs a deployed provider). `wrangler.jsonc` remains unstaged.

## Next

All tasks done. Left for the owner: push the branch / open a PR; decide `wrangler.jsonc`; set one provider's secrets and try a real reset end to end; browser pass on /sign-up, /forgot-password, /reset-password and change-password.
