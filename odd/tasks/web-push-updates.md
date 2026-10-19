# Web Push updates

## Objective

When Grok (or the web) creates an expense, the signed-in browser shows a notification and, if a tab is open, refreshes the finance queries. No WebSockets, no polling, no Durable Objects.

## Problem

MCP writes do not reach the open TanStack Query cache. `staleTime` is 30s and nothing invalidates across clients.

## Why this shape

Web Push is one Worker subrequest per write. Chrome and Edge require `userVisibleOnly: true` and a visible notification; silent push is not the design. The page does not insert the expense into the DOM. It invalidates existing queries, because balances are computed.

## Scope

- Save and delete a push subscription for the session user.
- On expense creation only, send one generic notification in the user's locale.
- Service worker shows that notification and `postMessage`s open tabs.
- The app invalidates `transactions`, `balances`, `transfers`, and `recurring-expenses`.

## Out of scope

- Transfers, balance adjustments, contacts, categories, accounts, settings, onboarding.
- Notifying inside `createTransaction` (confirm-recurring would double-fire).
- WebSockets, SSE, Durable Objects, polling.
- Inserting the expense payload into the DOM.

## Constraints

- Notify once at the HTTP route and MCP tool boundary for `POST /api/transactions`, `create_transaction`, `POST /api/recurring-expenses/:id/confirm`, and `confirm_recurring`.
- Subscription routes use `requireSession`. `userId` never comes from the body.
- VAPID private key is a secret, not a committed var. Extend `AppEnv['Bindings']` in `app-env.ts`. Do not hand-edit `worker-configuration.d.ts`.
- Do not use the `web-push` npm package. It does not run on Workers (web-push-libs/web-push#718). Send with `@block65/webcrypto-web-push` after reading its README.
- Notification copy lives in both `packages/i18n/messages/{en,es}.json`. The API renders it with the request or MCP locale.
- Permission is requested only from a settings-page click. If already granted, the app shell may resubscribe.
- Chrome must get `showNotification` on every push.

## TDD

Mode: unknown (no project or session TDD switch found). Source: search of repo config and `~/.pi` did not set a mode. Runner: `pnpm --filter @dqfinance/api test` (`node --test`). Ordinary functional checks, not strict red-green-refactor.

## Delivery

Strategy: `ask-on-risk`. Forecast: about 650 authored lines. Chain strategy: `feature-branch-chain` (user choice).

| Slice | Branch | Base | Holds |
| --- | --- | --- | --- |
| tracker | `feat/web-push-updates` | `main` | integration only; no direct commits |
| 1 | `feat/web-push-updates-01-subscriptions` | tracker | `push-1` |
| 2 | `feat/web-push-updates-02-send` | slice 1 | `push-2` |
| 3 | `feat/web-push-updates-03-web` | slice 2 | `push-3` |

PRs are not opened until asked. Child 1 targets the tracker; later children target the previous slice.

## Tasks

- [x] `push-1` Subscription table, session routes, error catalog, env secret names. Route: delegated (multi-file write).
- [x] `push-2` Send one notification after expense creation, including confirm-recurring once. Route: delegated. Income creates do not notify.
- [x] `push-3` Service worker, settings opt-in, query invalidation on `postMessage`. Route: delegated. Permission is requested only from the settings button.

## Acceptance

- A signed-in user can store a subscription and remove it.
- Creating an expense via HTTP or MCP sends one push when a subscription exists. Confirm-recurring sends one, not two.
- Missing VAPID config fails the public-key route with `push_not_configured`, not a throw from the crypto library.
- An open tab invalidates finance queries when the push arrives.
- `pnpm check-types && pnpm test && pnpm build` from the root passes at feature close.

## Progress

Tracker `feat/web-push-updates` stays at `main`. Slice 1 is `feat/web-push-updates-01-subscriptions`.

`push-1` commit: `dc3e97af6c4cc9f37cd540be532535f34d8ea24c`.

`push-2` commit: `ba514920dd9b0c6beb56d0266aeb230a2c0b05c9` `feat(push): notify the browser when an expense is recorded`. api test 20 pass. Independent verify passed, with a gap: non-404/410 error responses were silent. Parent logged those in `send-expense-push.ts` and re-ran api test: 20 pass.

`push-3` commit: `e1d6785bc3dc3b98bc52de3c3ec558dbcf991d64` `feat(web): refresh open pages when an expense push arrives`. Web check-types passed. Parent added base64url padding in `fromBase64Url` before that commit.

Closure on `feat/web-push-updates-03-web`: `pnpm check-types` exit 0, `pnpm test` exit 0 (api 20 pass, file-size 5 pass), `pnpm build` exit 0. No browser run.

## Next

None. PRs are not opened. To try it, set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` in `apps/api/.dev.vars`, restart the API, and enable notifications in Settings.
