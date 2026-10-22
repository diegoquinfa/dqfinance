# Custom categories

## Objective

Let the user shape the categories they record against: rename them, give them an icon and a color, delete the
ones they do not use, and merge one into another without losing a movement.

Proposal 9 in [2026-10-21-feature-proposals.md](../docs/plans/2026-10-21-feature-proposals.md).

## Problem

Categories can only be created. A typo stays forever, a category nobody uses stays in the picker, and two
categories that mean the same thing both stay. The movement is what matters, so the category must be able to
move underneath it.

## Why this shape

- **A category keeps its kind.** Expense and income are different lists, and a movement's category must match
  its type. Changing the kind of a category would strand the movements booked under it.
- **Delete and merge are different operations.** Deleting a category that has movements would either lose them
  or leave them without a category, so delete only works on an unused one; merging is how a used one goes away.
- **The icon and the color are presentation.** The API stores their names and the web maps them to a look, the
  same way a card stores its color name.

## Scope

- Rename a category and set (or clear) its icon and color.
- Delete a category that has no movements.
- Merge a category into another of the same kind: its movements move over and it disappears.
- The category list shows the icon and the color; the picker in the movement form shows them too.
- MCP tools: `update_category`, `delete_category`, `merge_categories`.

## Out of scope

- Subcategories.
- Moving a movement between categories from the movement itself (the edit dialog already changes it).
- Changing a category's kind.
- Icons outside the curated set.

## Constraints

- Every query filters by `userId`, taken from the session.
- System categories (FX difference, bank fees) are booked automatically: they are read-only.
- A merge is two writes: the movements move, then the category goes. They run in one D1 batch, so the category
  never disappears with its movements still pointing at it.
- The icon and the color are names from a fixed list, validated at the boundary.
- The error catalog gains one code per new failure, with a message in both catalogs.

## TDD

Pure rules in `category-merge-rules.ts` with a `node:test` file beside it. The rest is database work.

## Delivery

Chain strategy: `feature-branch-chain`.

| Slice | Branch | Base | Holds |
| --- | --- | --- | --- |
| tracker | `feat/proposals` | `main` | integration only; no direct commits |
| 1 | `feat/proposals-09-categories` | tracker | `categories` |

## Tasks

- [ ] `categories` API: icon and color columns, update, delete, merge, tools, errors, migration.
- [ ] `categories` web: the settings panel gains edit, delete and merge; the picker shows the mark.

## Acceptance

- A category can be renamed and given an icon and a color, from the web and from an agent.
- A category with movements cannot be deleted; merging it into another of the same kind moves its movements.
- A category of another user is not found, and a system category cannot be changed.
- `pnpm check-types && pnpm test && pnpm build` from the root passes at feature close.
