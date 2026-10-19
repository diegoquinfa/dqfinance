# Contacts

## Objective

Contacts answer "where did my money go". The list shows what each person or business costs, the detail page shows the shape of that spending: by category, over time, and the movements behind it.

## Problem

`/contacts` listed names with no numbers, could only create, kept empty headings for kinds with no contacts, filtered in the browser, and never linked to the movements. `/contacts/$id` showed one total and a list: no period, no composition, no rhythm, no statistics, and no way to record a movement with that contact.

## Why this shape

A contact is a "where did my money go" answer (D10), so a row without money is a list of words. The category is the app's own answer to the same question, so the detail page groups by it. Money never mixes currencies, so every aggregate is per currency and the primary one leads.

## Scope

- `GET /api/counterparties` returns per contact: `totals` per currency (spent, received), `movements`, `lastMovementAt`.
- `PATCH /api/counterparties/:id` renames and changes the kind. `DELETE /api/counterparties/:id` removes it; the movements survive and lose the name (`onDelete: set null`).
- MCP `update_contact` and `delete_contact`.
- One unified list on `/contacts` with a kind filter and the search in the URL, both sent to the server.
- A row with the amounts, the movement count and the last movement, a kind tag, and a menu to rename or delete.
- `/contacts/$id`: header with the money, `01 Categories` with proportional bars, `02 Evolution` as a monthly line with a 6M/12M period, `03 Movements`, and a "New movement" action that preselects the contact.
- `GET /api/counterparties/:id` returns the contact with `byCategory` and `monthly` inside the period.

## Out of scope

- Tax id, notes, phone or email on a contact: they need a schema change.
- Avatars, sorting the list by total spent, comparing two contacts, exporting.
- Editing the contact from the detail page: the row menu already does it.
- Creating a contact inline from the movement form.

## Constraints

- Every query filters by the session `userId`; it never comes from the body.
- Money is per currency and never mixed; the primary currency leads and the rest are smaller lines.
- A foreign card charge counts in the card's currency, as everywhere.
- A system category has no stored name: it is translated on every read, so the API returns its `systemKey`.
- Deleting a contact must not delete its movements.
- Every visible string comes from `packages/i18n`, both catalogs.
- A section without a number is a defect: the numbering is contiguous per page.

## TDD

Mode: unknown (no project or session TDD switch found). Source: search of repo config and `~/.pi` did not set a mode. Runner: `pnpm --filter @dqfinance/api test` and `pnpm --filter @dqfinance/web test` (`node --test`). Ordinary functional checks, not strict red-green-refactor. Pure helpers (the aggregate fold) are unit tested.

## Delivery

Strategy: ask-on-risk. Forecast: about 900 authored lines. Chain strategy: one branch, `feat/contacts` (base `main`). The contacts work was already in the working tree; the review fixes and the detail page follow on the same branch.

PRs are not opened until asked.

## Tasks

- [x] `contact-1` API aggregates, PATCH, DELETE, MCP tools. Route: delegated.
- [x] `contact-2` Web unified list, row with numbers, rename/delete, detail page. Route: delegated.
- [ ] `contact-3` The six review findings fixed. Route: inline.
- [ ] `contact-4` Detail page: categories, evolution, period, statistics. Route: inline.

## Acceptance

- A contact row shows what was spent and received, how many movements, and when the last one was.
- Renaming and deleting work; deleting keeps the movements.
- The list filters by kind and searches on the server, both from the URL.
- The detail page groups the spending by category, shows the monthly line, and offers a movement with that contact.
- `pnpm check-types && pnpm test && pnpm build` from the root passes at feature close.

## Progress

`contact-1` and `contact-2` were implemented by delegated workers and reviewed by an independent reviewer. The reviewer found no blockers and six findings, all in `contact-3`.

## Next

`contact-3` then `contact-4`, then the close. The native review candidate is a work-unit commit, not this branch.
