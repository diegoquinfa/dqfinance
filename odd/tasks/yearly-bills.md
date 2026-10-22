# Yearly bills set aside monthly

## Objective

A yearly bill stops surprising the user: a twelfth of its amount is set aside every month, so the money
is there when it comes.

Proposal 4 in [2026-10-21-feature-proposals.md](../docs/plans/2026-10-21-feature-proposals.md).

## Problem

The recurring expense already knows how to repeat a bill every year. What it does not do is reserve the
money. The user pays the whole bill in one go and the month's balance drops to zero without warning.

## Why this shape

- **A twelfth, not a twelfth of the month left.** The reservation is the same every month, so the number
  the user learns does not move around.
- **The cents that do not divide stay with the bill.** A bill of $100.01 sets aside $8.33 a month; the
  three cents left over are the bill's.
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
- The rule is one line of arithmetic, so it lives in its own file with a test beside it.

## TDD

`monthly-set-aside.ts` (pure) with a `node:test` file beside it.

## Delivery

Chain strategy: `feature-branch-chain`.

| Slice | Branch | Base | Holds |
| --- | --- | --- | --- |
| 1 | `feat/proposals-09-categories` | tracker | `categories` |
| 2 | `feat/proposals-11-search` | slice 1 | `search` |
| 3 | `feat/proposals-01-safe-to-spend` | slice 2 | `spending` |
| 4 | `feat/proposals-04-yearly-bills` | slice 3 | `spending` |

## Tasks

- [ ] The rule: a twelfth a month, the rest stays with the bill.
- [ ] The number and the card show the reservation.

## Acceptance

- A yearly bill of $1,200 sets aside $100 a month, and the safe-to-spend number drops by that much.
- A bill that does not divide leaves its extra cents with the bill.
- `pnpm check-types && pnpm test && pnpm build` from the root passes at feature close.
