# Spread an expense over months

## Objective

The user can spread an unexpected expense over several months for budgeting, so the month does not drop
to zero.

Proposal 5 in [2026-10-21-feature-proposals.md](../../docs/plans/2026-10-21-feature-proposals.md).

## Problem

A washing machine is one big expense in one month. The balance drops to zero and the rest of the month
looks like a disaster, even when the user planned for it.

## Why this shape

- **The movement does not change.** It keeps its date and its amount: the money left the account when it
  left. Only the budget and the safe-to-spend number see it in parts.
- **The share of the month it happened in is already spent.** What the number adds back is the share of
  the months that have not come yet, so the money that is owed later is not counted twice.
- **The cents that do not divide stay with the first month.** The shares add up to the whole amount.

## Scope

- The movement form asks how many months the expense is spread over (one go, 3, 6, 12).
- `installmentMonths` on the movement, editable afterwards.
- The safe-to-spend number adds back the months that have not come yet.

## Out of scope

- A schedule of movements: there is only one movement, spread for the budget.
- The monthly budget per category (proposal 13), which is where the parts show up as a limit.
- The forecast (proposal 2), which reads these movements when it is built.

## Constraints

- Money is integer cents; the shares are whole cents.
- Only the expenses of the primary currency take part in the number.
- The months are counted from the month the movement happened in, so the day of the month never matters.

## TDD

`installments.ts` (pure) with a `node:test` file beside it: the shares, the months between, and what is
still owed.

## Delivery

Chain strategy: `feature-branch-chain`.

| Slice | Branch | Base | Holds |
| --- | --- | --- | --- |
| 5 | `feat/proposals-06-savings-goals` | slice 4 | `savings-goals` |
| 6 | `feat/proposals-07-expected-incomes` | slice 5 | `expected-incomes` |
| 7 | `feat/proposals-05-installments` | slice 6 | `transactions` |

## Tasks

- [x] `transactions` API: the column, the input, the edit. Commit `c290608`.
- [x] `transactions` web: the field in the movement form. Commit `c290608`.
- [x] `spending`: the months that have not come yet count as the user's. Commit `c290608`.

## Acceptance

- An expense of $600 over six months counts $100 a month, and the first month keeps the extra cents.
- The safe-to-spend number only adds back the months that have not happened yet.
- The movement keeps its date and its amount.
- `pnpm check-types && pnpm test && pnpm build` from the root passes at feature close.
