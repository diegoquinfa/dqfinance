# Budgets

## Objective

A limit per category, and how close the user is to it.

Proposal 13 in [2026-10-21-feature-proposals.md](../../docs/plans/2026-10-21-feature-proposals.md).

## Problem

The safe-to-spend number answers "how much may I spend today", not "am I eating too much on restaurants this
month". A limit per category answers the second question.

## Why this shape

- **One limit per category, every month.** The user sets a standing limit, not a limit for a month. The
  budget then always answers the same question.
- **The limit is not a block.** Nothing is refused: the app says how close the user is, and the user
  decides.
- **The spent is what was spent this month.** Transfers and adjustments are not expenses (design D3), so
  they never eat a limit.
- **Close is a fifth of the limit left.** A number the user can act on, not a percentage that needs
  thinking about.

## Scope

- `GET/POST /api/budgets`, `DELETE /api/budgets/:id`.
- MCP tools: `list_budgets`, `set_budget`, `delete_budget`.
- A `/budgets` page: the limits, what was spent, what is left.

## Out of scope

- A limit per month (the limit is standing).
- Limits for a source (an account or a card) instead of a category.
- A forecast of the month from the budget: the forecast already projects the bills and the incomes.

## Constraints

- Every query filters by `userId`, taken from the session.
- Money is integer cents.
- One limit per category: setting it again replaces the old one.

## TDD

`budget-progress.ts` (pure) with a `node:test` file beside it: what is left, the ratio, and what counts as
close.

## Delivery

Chain strategy: `feature-branch-chain`.

| Slice | Branch | Base | Holds |
| --- | --- | --- | --- |
| 9 | `feat/proposals-02-forecast` | slice 8 | `spending` |
| 10 | `feat/proposals-13-budgets` | slice 9 | `budgets` |

## Tasks

- [x] `budgets` API: the limit, the spent, the progress, the tools. Commit `4438a85`.
- [x] `budgets` web: the page and the nav entry. Commit `4438a85`.

## Acceptance

- A category with a limit shows what was spent and what is left.
- Setting a limit again replaces the old one, it does not add a second.
- A limit with a fifth of it left says it is close.
- `pnpm check-types && pnpm test && pnpm build` from the root passes at feature close.
