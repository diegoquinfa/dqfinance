# Yearly bills set aside monthly

## Objective

A yearly bill stops surprising the user: the money for it is held back a twelfth at a time, every month
from twelve months before it falls due, so the money is there when it comes.

Proposal 4 in [2026-10-21-feature-proposals.md](../../docs/plans/2026-10-21-feature-proposals.md).

## Problem

The recurring expense already knows how to repeat a bill every year. What it does not do is reserve the
money. The user pays the whole bill in one go and the month's balance drops to zero without warning.

## Why this shape

- **What the bill should already hold, not this month's twelfth.** The money put aside in earlier months
  is still in the accounts, so a reservation that forgets it frees the money again. A bill due in
  December holds one twelfth in January, two in February, and the whole bill in December.
- **The cents that do not divide stay with the bill.** A bill of $100.01 due next month holds $91.67; the
  cents left over are the bill's.
- **The reservation is not a second account.** It is a rule on the safe-to-spend number, not money that
  moves anywhere. The bill still leaves the account when it is confirmed.

## Scope

- The safe-to-spend number subtracts what the yearly bills set aside.
- The card shows the reservation and says where it comes from.

## Out of scope

- Moving the money into a savings goal (proposal 6): that is a place the user chooses, this is a rule.
- The yearly bill's calendar projection: it already repeats.

## Constraints

- The reservation counts the active yearly bills of the primary currency only.
- The rule is a few lines of arithmetic, so it lives in the pure `safe-to-spend.ts`, with its test beside it.

## TDD

`safe-to-spend.ts` (pure) with its `node:test` file beside it.

## Delivery

Chain strategy: `feature-branch-chain`.

| Slice | Branch | Base | Holds |
| --- | --- | --- | --- |
| 1 | `feat/proposals-09-categories` | tracker | `categories` |
| 2 | `feat/proposals-11-search` | slice 1 | `search` |
| 3 | `feat/proposals-01-safe-to-spend` | slice 2 | `spending` |
| 4 | `feat/proposals-04-yearly-bills` | slice 3 | `spending` |

## Tasks

- [x] The rule: the twelfths its cycle has earned, the rest stays with the bill. Commit `c5ec9cf` set a
  twelfth a month; the fix that followed holds what the bill should already have put aside.
- [x] The number and the card show the reservation. Commit `c5ec9cf`.

## Acceptance

- A yearly bill of $1,200 due in December holds $100 in January and $200 in February, and the safe-to-spend
  number holds that much back every month until it is paid.
- A bill that does not divide leaves its extra cents with the bill.
- `pnpm check-types && pnpm test && pnpm build` from the root passes at feature close.
