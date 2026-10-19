# Contacts screen: analysis and plan

Date: 2026-10-19. Status: approved (scope B: numbers, rename/delete, contact detail; one unified list with a kind filter, like /transactions).

## How it is today

`/contacts` lists counterparties in two sections (Personas, Comercios). A row is a name and nothing else. The API returns `{id, name, kind}` and nothing more: no totals, no counts, no dates. There is no edit and no delete. The search filters the list in the browser.

## Problems

1. **A contact row says nothing.** "José" alone does not answer "how much do I spend there?". The app's premise is "where did my money go?" and a counterparty is exactly that answer (D10: who money went to or came from). Nothing in the API can answer it: no per-counterparty aggregate exists anywhere.
2. **Create only.** No rename, no delete. A typo or a duplicate is permanent, and the MCP tool even warns "check list_contacts first to avoid duplicates" because the app itself cannot.
3. **Empty sections still show a heading.** "Comercios" renders with nothing under it, and a search that matches nobody leaves two headings and no answer.
4. **The search filters but does not reorganize.** You cannot tell whether a miss is in Personas or Comercios, because the result stays in its own section.
5. **A dead end.** `transaction.counterparty_id` exists and the transactions list accepts `counterpartyId` as a filter, but the screen never links to it. You cannot see who you paid or when.

## Plan

### A. Numbers per contact (the core)

`GET /api/counterparties` returns, per contact, the aggregates of its movements:

- `totals`: per currency, `spent` (expenses) and `received` (incomes). Money never mixes currencies (DESIGN principle 8), so the aggregate is per currency: the primary currency leads, others as smaller lines.
- `movements`: how many movements the contact has.
- `lastMovementAt`: the date of its most recent movement.

Computed in SQL with a left join and a group by, following `summarize-transactions.ts`: only the user's rows, and the same `coalesce(primaryAmountCents, amountCents)` rule so a foreign card charge counts in the card's currency.

The row then reads:

```
José                                    −45.000 COP
12 movimientos · 14 oct 2026
```

The amount is on the right in `ink` with a minus sign: an expense is normal, not alarming (DESIGN principle 2). The count and the date are `label-mono` muted.

### B. Rename and delete

- `PATCH /api/counterparties/:id` (name, kind) and `DELETE /api/counterparties/:id`.
- Deleting is safe by construction: `transaction.counterparty_id` and `recurring_expense.counterparty_id` are `onDelete: set null`, so the movements survive and only lose the name. The confirm dialog says exactly that.
- A row menu (the same "Add ▾" pattern as the accounts page) with Rename and Delete, plus an `AlertDialog` for the delete.

### C. One list with a kind filter

Like `/transactions`: a `ToggleGroup` with **Todos / Personas / Comercios** above one unified list, and each row carries a PERSONA / COMERCIO tag. The filter lives in the URL (`?kind=person`), so it survives a reload and can be shared.

- One list, not two sections: the person does not know which section a hit belongs to, and a contact is the same thing either way.
- No empty headings: there is one list, so there is nothing empty to render. A search or filter that matches nobody shows one empty state ("nothing for X").
- The filter row follows the `/transactions` pattern (a labelled `ToggleGroup` of Todos / Personas / Comercios, `sm:col-span-2 lg:col-span-1` in the filter grid).

### D. Search on the server

The API already accepts `search` and `kind`; the web filters the whole list in the browser instead. Use the server filter, debounced, so it stays correct with many contacts.

### E. From a contact to its movements

`/contacts/$id`: the contact's name, kind and totals as the header, then its movements through the existing `counterpartyId` filter of `GET /api/transactions`, with the standard transaction rows. The screen stops being a dead end.

### F. Creating without duplicates

The new-contact dialog checks the typed name against the existing contacts and says "that name already exists" instead of letting a duplicate through. The API's `search` already does the match.

### G. The row

```
PERSONA   José                                    −45.000 COP
          12 movimientos · 14 oct 2026
```

- Name in `type-heading-sm` (the row-name convention), the kind tag beside it as a mono `Badge`.
- Amounts on the right in `ink` with a minus for spending and the income green with a plus; both appear only when there is one.
- `movements` and `lastMovementAt` in `label-mono` muted.
- A row menu (the "Add ▾" pattern of the accounts page) with Rename and Delete.

## Not built

- Tax id (NIT), notes, phone or email on a contact: they need a schema change and a migration; they come after the numbers, if wanted.
- Avatars or photos.
- Sorting the list by total spent.
- Creating a contact inline from the movement form.
