# Savings goals

## Objective

The user names what they are saving for, puts money into it, and the app keeps that money out of the
daily spending.

Proposal 6 in [2026-10-21-feature-proposals.md](../docs/plans/2026-10-21-feature-proposals.md).

## Problem

The safe-to-spend number knows the bills, but not the thing the user is saving for. Money meant for the
emergency fund looks exactly like money to spend this weekend.

## Why this shape

- **A goal is a promise, not an account.** The money stays where it is; the goal only says how much of it
  is spoken for. No transfer, no new source, no bookkeeping the user has to trust.
- **A goal with a date asks for a share every month.** What is left of it, spread over the months left,
  is what the daily number keeps back. A goal without a date has no schedule, so it asks for nothing: the
  user manages it by hand.
- **The progress is what the user put in.** Contributions are their own rows, so the history of a goal is
  the history of what was saved.

## Scope

- `GET/POST /api/savings`, `POST /api/savings/contributions`, `DELETE /api/savings/:id`.
- MCP tools: `list_savings_goals`, `create_savings_goal`, `add_savings_contribution`, `delete_savings_goal`.
- A `/savings` page: the goals, their progress, and the actions.
- The safe-to-spend number subtracts what the goals ask for.

## Out of scope

- Moving money into a goal (a transfer is a different thing, and the user may not want it).
- The goal's own account or balance: the money is in the user's own sources.
- The forecast (proposal 2), which reads the goals when it is built.

## Constraints

- Every query filters by `userId`, taken from the session.
- Money is integer cents; only the amounts the web shows are decimals.
- Deleting a goal deletes its contributions in the same batch.
- The monthly share is rounded down, like every other division in the app.

## TDD

`goal-progress.ts` (pure) with a `node:test` file beside it: the months left, the ratio, and the share.

## Delivery

Chain strategy: `feature-branch-chain`.

| Slice | Branch | Base | Holds |
| --- | --- | --- | --- |
| 1 | `feat/proposals-09-categories` | tracker | `categories` |
| 2 | `feat/proposals-11-search` | slice 1 | `search` |
| 3 | `feat/proposals-01-safe-to-spend` | slice 2 | `spending` |
| 4 | `feat/proposals-04-yearly-bills` | slice 3 | `spending` |
| 5 | `feat/proposals-06-savings-goals` | slice 4 | `savings-goals` |

## Tasks

- [ ] `savings-goals` API: the goals, the contributions, the progress, the tools.
- [ ] `savings-goals` web: the page and the nav entry.

## Acceptance

- A goal shows what it holds, what is left and what it asks for every month.
- A goal with a date keeps its share out of the safe-to-spend number.
- Deleting a goal takes its contributions with it.
- `pnpm check-types && pnpm test && pnpm build` from the root passes at feature close.
