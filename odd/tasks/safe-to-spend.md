# Safe to spend

## Objective

One number the user checks most: how much may I spend **today**.

Proposal 1 in [2026-10-21-feature-proposals.md](../../docs/plans/2026-10-21-feature-proposals.md).

## Problem

The overview says what the user has. It does not say what they may spend, and the difference between the two is
where the anxiety lives: the bills still due, the money set aside, and the days left in the month.

## Why this shape

```
today = (money in hand − fixed bills still due − savings and set-asides) / days left
```

- **Days left, not days of the month.** The number corrects itself: overspend yesterday and today's figure
  drops; underspend and it rises.
- **The lower of two numbers wins.** The user's monthly target is a cap: when the cap divided by the days left
  is lower than what the money allows, the cap is what the user gets.
- **The cap is per month, the money is per currency.** The figure is in the primary currency, where the bills
  and the target are counted.
- **Rounded down.** The figure never promises a cent more than there is.

## Scope

- `GET /api/spending/safe-to-spend`: the number and the pieces it comes from.
- MCP tool `safe_to_spend`.
- A card on the overview with the number.
- A monthly spending target on that card.

## Out of scope

- The yearly set-aside (proposal 4), the installments (proposal 5), the savings goals (proposal 6) and the
  irregular income (proposal 7). Each one feeds this number and lands in its own slice; the calculation already
  takes the set-asides as an input, so they plug in without touching the rule.
- The forecast (proposal 2), which is a different question and a different view.
- Per-category budgets (proposal 13).

## Constraints

- Every query filters by `userId`, taken from the session.
- Money is integer cents; only the final figure is a decimal.
- The card's debt counts against the money in hand: a charge not paid yet is not money to spend.
- Transfers and balance adjustments are never expenses (design D3), so they are not part of what was spent.
- The period ends on the last day of the user's month, in their timezone.

## TDD

`safe-to-spend.ts` and `spending-period.ts` (pure) with a `node:test` file beside each: the rule, the cap, the
rounding, the overspend, and the days left across month and year ends.

## Delivery

Chain strategy: `feature-branch-chain`.

| Slice | Branch | Base | Holds |
| --- | --- | --- | --- |
| 1 | `feat/proposals-09-categories` | tracker | `categories` |
| 2 | `feat/proposals-11-search` | slice 1 | `search` |
| 3 | `feat/proposals-01-safe-to-spend` | slice 2 | `spending` |

## Tasks

- [x] `spending` API: the rule, the use case, the route, the tool. Commit `4cb1817`.
- [x] `spending` web: the card on the overview and the target on the card. Commit `4cb1817`.

## Acceptance

- The number is the money in hand minus the bills still due, divided by the days left in the month.
- A monthly target lower than the money's allowance becomes the number.
- The figure never promises more than there is.
- `pnpm check-types && pnpm test && pnpm build` from the root passes at feature close.
