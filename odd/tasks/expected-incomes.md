# Expected incomes

## Objective

The user tells the app what money is coming and when, and the daily number counts on it.

Proposal 7 in [2026-10-21-feature-proposals.md](../../docs/plans/2026-10-21-feature-proposals.md).

## Problem

The safe-to-spend number assumes a single payday: the end of the month. Someone paid on the 15th and on
the 30th, or a freelancer who invoices every few weeks, gets a number that is wrong most of the time.

## Why this shape

- **Several incomes, one number.** The user can have a salary, an invoice and a rent. The period ends at
  the first one that arrives, and the money it brings is part of what the days can be spent on.
- **The frequency carries the date.** The user says "every two weeks" and the app knows the next payday
  without being told twice. An irregular income keeps the date the user set.
- **The day of the month does not drift.** A bill on the 31st stays on the 31st after passing through
  February: the date is always counted from the anchor, never from the last occurrence.

## Scope

- `GET/POST /api/incomes`, `DELETE /api/incomes/:id`.
- MCP tools: `list_expected_incomes`, `create_expected_income`, `delete_expected_income`.
- The safe-to-spend period ends at the next payday, and the income that arrives counts into the money
  the days can be spent on.
- A `/incomes` page: the incomes, when each one arrives, and the actions.

## Out of scope

- Estimating the income from the history (the proposal mentions it; the user says the amount instead).
- The forecast (proposal 2), which reads these incomes when it is built.
- A different treatment for the expenses that already happened: the movements stay where they are.

## Constraints

- Every query filters by `userId`, taken from the session.
- Only the incomes of the primary currency take part in the number.
- The money that arrives during the period counts; the money that arrived before it does not.

## TDD

`next-income-date.ts` (pure) with a `node:test` file beside it, and `income-period.ts` (pure) with its
own: the next payday, and the period it defines.

## Delivery

Chain strategy: `feature-branch-chain`.

| Slice | Branch | Base | Holds |
| --- | --- | --- | --- |
| 1 | `feat/proposals-09-categories` | tracker | `categories` |
| 2 | `feat/proposals-11-search` | slice 1 | `search` |
| 3 | `feat/proposals-01-safe-to-spend` | slice 2 | `spending` |
| 4 | `feat/proposals-04-yearly-bills` | slice 3 | `spending` |
| 5 | `feat/proposals-06-savings-goals` | slice 4 | `savings-goals` |
| 6 | `feat/proposals-07-expected-incomes` | slice 5 | `expected-incomes` |

## Tasks

- [x] `expected-incomes` API: the incomes, the next payday, the tools. Commit `132df4b`.
- [x] `expected-incomes` web: the page and the nav entry. Commit `132df4b`.
- [x] `spending`: the period ends at the next payday. Commit `132df4b`.

## Acceptance

- An income that arrives before the end of the month shortens the period and its money counts.
- An income that arrives after the end of the month changes nothing.
- A payday on the 31st stays on the 31st in March.
- `pnpm check-types && pnpm test && pnpm build` from the root passes at feature close.
