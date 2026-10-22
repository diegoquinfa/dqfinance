# Reminders and webhooks

## Objective

The user asks the app to warn before a bill is due, and the app can tell other systems too.

Proposal 3 in [2026-10-21-feature-proposals.md](../docs/plans/2026-10-21-feature-proposals.md).

## Problem

A bill that is due tomorrow is only a problem if the user learns about it tomorrow. And a user who
automates things wants the app to speak their language, not to be polled.

## Why this shape

- **The lead time belongs to the user.** Days before the due date, decided per user, not per feature.
- **The webhook carries a signature.** The user's own automation has to know the call came from the app
  and nobody else: the body is signed with a secret only the user and the app know.
- **The endpoint is checked before it is called.** A webhook is a URL the user gave, and the app makes
  requests to it: the same rule the push endpoints follow (https, a public host, no private ranges).
- **A failed call is not a failed app.** The bill is still there; the delivery is retried or dropped and
  reported.

## Scope

- A webhook per user: the URL, the secret, and which events it wants.
- The app posts a signed event when a recurring expense falls due inside the lead time.
- The lead time in the settings, and the warning on the overview.

## Out of scope

- In-app push notifications for the warning: the app already has Web Push, and this proposal is about
  leaving the app.
- Retrying forever, or a dead-letter queue: a delivery that fails is reported and can be sent again by hand.
- Signing in with the webhook: the signature proves the call, it does not open a session.

## Constraints

- Every query filters by `userId`, taken from the session.
- The secret is stored as the user typed it and never leaves the app: it is never sent back in a
  response, only its fingerprint.
- The signature is computed over the raw body with a constant-time comparison.
- The endpoint passes the same public-host check as the push endpoints (`push-endpoint.ts`).
- The delivery happens outside the request: a slow endpoint must not delay the app.

## TDD

`webhook-signature.ts` (pure) with a `node:test` file beside it: the signature of a body, and that the
same body always signs the same way.

## Delivery

Chain strategy: `feature-branch-chain`.

| Slice | Branch | Base | Holds |
| --- | --- | --- | --- |
| 7 | `feat/proposals-05-installments` | slice 6 | `transactions` |
| 8 | `feat/proposals-03-reminders` | slice 7 | `webhooks` |

## Tasks

- [ ] `webhooks` API: the hooks, the secret, the delivery.
- [ ] `webhooks` web: the settings block and the overview warning.

## Acceptance

- The app warns before a bill is due, the days before the user asked for.
- A webhook call carries a signature the user's automation can check.
- A webhook to a private address is refused.
- `pnpm check-types && pnpm test && pnpm build` from the root passes at feature close.
