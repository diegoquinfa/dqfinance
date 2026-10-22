# Statement import: the day of the user and the rule for duplicates

## Objective

A statement imported as CSV becomes movements on the right day, and the import never drops a
real movement without saying so.

## Problem

Two defects in the statement import (`features/transactions/import-transactions.ts`):

1. **The day was one day behind.** A calendar date of the statement was stored as midnight
   UTC. In America/Bogota that instant is the previous day at 19:00, so a movement of the
   21st was seen on the 20th: in the calendar, in `/transactions`, and in the budgets of the
   month. The app already had the other convention (`features/demo/seed-demo.ts`): a day is
   stored so that it reads as that day.
2. **The key of the import was not a key.** The signature of a movement was
   `type|amount|UTC day`, and two rows were the same one when either title was missing
   (`!a || !b || a === b`). Two different charges of the same amount on the same day, from a
   statement that does not name them, were the second one skipped in silence: the user lost
   the movement.

## The rule

**Two movements are the same one when they share type, amount and calendar day, and a title
or a description that both of them carry matches.** The day is the day of the user
(`user_settings.timezone`), never the UTC day.

The evidence has to be positive. A title that is missing is not evidence of anything: it can
neither make two movements the same one nor make them different. What is left after the
comparison is *unknown*, and unknown is not a reason to skip a movement.

The comparison of two rows that share type, amount and day is one of three:

| | Same | Different | Unknown |
| --- | --- | --- | --- |
| Both carry the same title | the same movement | | |
| Both carry the same description | the same movement | | |
| Both name themselves and the names differ | | different movements | |
| Nothing names them both | | | unknown |

## The trade-off

**Unknown rows are imported and shown in the preview as a possible duplicate.** They are not
skipped.

Losing a real movement is worse than showing one row too many: the preview is where the
user decides, and a row that is marked there is a row the user can see and cancel. A
movement that is silently skipped is a movement the user never learns about.

The price of that choice is known and written down:

- **A statement whose rows have no title and no description cannot be protected against
  being imported twice.** The second import finds rows that are unknown to each other, not
  the same ones, so it imports them again and marks every one of them as a possible
  duplicate. The protection needs a name: with a title or a description, the second import
  of the same statement creates nothing.
- Two rows of the same batch with the same amount and day and no name are imported as two
  movements. They may well be one movement seen twice; the preview says so on the second
  one.

## Scope

- `parseOccurredAt` stores the instant the day starts in the timezone of the user, so the
  day never shifts.
- The window of the query that reads the movements already recorded covers the local days
  of the batch, not the UTC ones.
- `duplicate.ts` holds the rule, pure, with the day of the user.
- The preview says two things: `duplicate` (the movement is already recorded, it is not
  imported) and `possibleDuplicate` (it is imported, and it only looks like one).
- The web shows the second one with its own badge, in both catalogs.

## Out of scope

- The movements that were imported before this change keep the midnight UTC of the old rule.
  They are not rewritten, so a statement imported again may add them a second time.

## Constraints

- Every query filters by `userId`, taken from the session or from the `sub` of the MCP
  token.
- The money stays in integer cents, always positive; the `type` carries the sign.
- No change of schema: the rule reads what the movements already have.

## TDD

`duplicate.ts` (pure) with a `node:test` file beside it: the day of the user, the window,
the same movement, the different one, the unknown one, and the statement imported twice.

## Acceptance

- A movement dated the 21st lands on the 21st in Bogotá and in Tokyo.
- Two movements of the same amount and day with different titles are both imported.
- Two rows of the same batch without a title are not dropped in silence.
- Importing the same statement twice with titles creates nothing the second time.
- `pnpm check-types && pnpm test && pnpm build` from the root passes at feature close.
