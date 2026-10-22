# The forecast

## Objective

One question, answered: will I run out of money before the month ends?

Proposal 2 in [2026-10-21-feature-proposals.md](../../docs/plans/2026-10-21-feature-proposals.md).

## Problem

The balances say what the user has now. What the user wants to know is what will be left after the bills
of the next days and the salary that lands on Friday.

## Why this shape

- **One line, one currency.** The projection is in the primary currency, where the bills and the incomes
  are counted.
- **It starts where the user stands.** The first point is the balance today, computed the same way the
  overview computes it.
- **The lowest point is the answer.** The day the line is lowest is the day the money runs out; the card
  says that day instead of making the user read the chart.
- **Only what is known moves it.** The recurring expenses and the expected incomes. A movement the user
  records tomorrow is not in the projection today.

## Scope

- `GET /api/spending/forecast`: the balance of each day until the end of the month, and the lowest point.
- A chart on the overview: the projected balance, day by day.

## Out of scope

- The projection beyond the end of the month.
- Guessing what the user will spend on things that are not bills: the projection only knows the recurring
  expenses and the expected incomes.
- The user's own "what if" scenarios.

## Constraints

- Every query filters by `userId`, taken from the session.
- Money is integer cents; the projection adds and subtracts cents, never decimals.
- The chart has a table for screen readers, like the balance chart: a chart is a picture of the data.

## TDD

`forecast.ts` (pure) with a `node:test` file beside it: the running balance and the lowest point.

## Delivery

Chain strategy: `feature-branch-chain`.

| Slice | Branch | Base | Holds |
| --- | --- | --- | --- |
| 8 | `feat/proposals-03-reminders` | slice 7 | `webhooks` |
| 9 | `feat/proposals-02-forecast` | slice 8 | `spending` |

## Tasks

- [x] `spending` API: the days, the projection, the lowest point. Commit `1209830`.
- [x] `spending` web: the chart on the overview. Commit `1209830`.

## Acceptance

- The first point is the balance today and the last one is the balance of the last day of the month.
- A bill on a day lowers the line from that day on; an income raises it.
- The card names the day the balance is lowest.
- `pnpm check-types && pnpm test && pnpm build` from the root passes at feature close.
