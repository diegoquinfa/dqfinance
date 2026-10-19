# Contact detail page

Date: 2026-10-19. Status: proposal, not implemented. Follows the contacts work (docs/plans/2026-10-19-contacts-screen-plan.md).

## How it is today

`/contacts/$id` shows the name, a kind tag, one amount and a list of movements. The page is mostly empty space: one section, a rail label and a list with one row. It answers "how much in total", which the list already answered, and nothing else.

## Problems

1. **No period.** The total has no "since when". All time, this month, this year? The amount alone cannot be read.
2. **No composition.** The movements carry a category (OTROS GASTOS in the screenshot), but the page never groups by it. "Where did my money go" is the app's premise and the category is the app's answer to it.
3. **No rhythm.** Nothing shows whether this is every month or once a year.
4. **No statistics.** How many movements, the average, the first and the last.
5. **No way to record a movement with this contact.** The empty state offers it, but a contact with movements has no action at all.
6. **The whole list is loaded to find one contact.** The page calls `GET /api/counterparties` and picks the one it needs.

## Plan

### Header

The name, the kind tag, the money block (spent big, received smaller, the count and the dates in mono), and a **New movement** action that opens the transaction dialog with this contact already chosen.

### 01 Categories

Rows per category: the name, the amount, and a proportional bar in tokens (a plain div, no chart library). The bar is what makes the breakdown readable at a glance.

- The API returns `byCategory: [{ categoryId, name, systemKey, kind, currency, amount }]`. A system category has no stored name (it is translated on every read), so the web resolves it from its `systemKey`; a user category carries its name.
- Sorted by amount, descending. The largest bar is the full width.

### 02 Evolution

A line of spending per month, with the 6M / 12M toggle the source page already uses (`lastMonths` in `shared/periods.ts`).

- The API returns `monthly: [{ month: 'YYYY-MM', currency, spent, received }]`.
- Lines only, as the design system's chart rule says: spending solid in `ink`, income dashed in `muted-foreground`. One currency on the chart (the primary); the rest stay in the totals block.
- The toggle changes the period, so the breakdown and the chart follow it.

### 03 Movements

The list as it is now, with the period applied to it as well.

### API

`GET /api/counterparties/:id?from&to` returns the contact with its totals plus `byCategory` and `monthly`, all inside the same period. It replaces the list call the page makes today.

- Ownership: the contact is loaded with the session's `userId`; a contact of another user is a 404 with the existing `counterparty_not_found`.
- Money stays per currency: the breakdown and the series carry a currency, never a mixed total.
- The foreign card rule applies as everywhere: the amount counts in the card's currency.

### A movement with this contact

`NewTransactionDialog` gets an optional `defaultCounterpartyId` and preselects it, the same way `NewTransferDialog` got `defaultFrom` / `defaultTo`.

## Not built

- Editing the contact from the detail page (the row menu on the list already does it).
- A comparison between two contacts.
- Exporting the contact's movements.
