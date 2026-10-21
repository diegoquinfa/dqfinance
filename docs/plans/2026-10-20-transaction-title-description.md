# Movements: a title and a description

Date: 2026-10-20. Status: proposed.

## Goal

A movement gets a short **title** that names it ("Internet Claro (PSE)") and a **description** with the details the title has no room for ("January bill, includes the router rental"). Today there is one field doing both jobs: the description is shown as the row title, so adding detail means writing a long title that the list truncates.

## What exists

- `transaction.description` (nullable text) is the only free text on a movement, capped at 200 characters by `createTransactionInput`. The web row shows `transaction.description || category.name` (`transaction-row.tsx`), and the detail sheet shows it again as a row.
- The form has a single "Description" input (`new-transaction-dialog.tsx`), the import maps a statement's description column to it (`csv.ts` → `import-transactions.ts`), and the duplicate rule compares it (`duplicate.ts`).
- `title` is not a word in the domain yet: [GLOSSARY.md](../../GLOSSARY.md) has no entry, and the data model in the [domain design](./2026-10-18-finance-domain-design.md#data-model) lists `description?` on `transaction`.

## Decisions

- **D15: a movement has a title and a description.** `title` is the short label (≤ 120 characters) that names the movement in every list; `description` is the long free text (≤ 2 000 characters) shown only in the movement's detail sheet. An empty title falls back to the category name, exactly as today.
- **The old description is the old title.** Every existing value was written to be the row title, so the migration moves it to `title` and clears `description`. Nothing is deleted: the value stays, one column over.
- **The title is the label a statement gives.** The import maps a statement's description column to `title`; a statement line longer than 120 characters keeps its full text as the description, so nothing is lost.
- **Duplicates compare the title.** The duplicate rule (same source, type, amount and day) separated rows by their description; it separates them by the title now, which is the field that names the movement.
- **No new table, no new screen.** The movement keeps its row; only the text it carries changes.

## Plan

### API (`apps/api/src/features/transactions/`)

1. `transaction.schema.ts`: add `title` next to `description`.
2. Migration: `ALTER TABLE transaction ADD COLUMN title text;` plus `UPDATE transaction SET title = description;` and `UPDATE transaction SET description = NULL;`.
3. `create-transaction.ts`: `title` (≤ 120) and `description` (≤ 2 000) in the input, both written and returned.
4. `update-transaction.ts` and `merge-transaction-update.ts`: `title` joins `description` as a field an edit may clear with `null`.
5. `list-transactions.ts`: the view carries both.
6. `import-transactions.ts`: a row is `{ type, amount, occurredAt, title?, description?, categoryId? }`; the duplicate check compares titles.
7. `duplicate.ts`: the fingerprint's `description` becomes `title`.
8. `transactions.tools.ts`: the tool descriptions speak of the title.
9. `demo/seed-demo.ts` and `recurring-expenses/confirm-recurring-expense.ts`: write the title.

### Web (`apps/web/src/features/transactions/`)

1. `transaction-row.tsx` and `transaction-detail-dialog.tsx`: the title names the movement; the detail sheet shows the description when there is one.
2. `new-transaction-dialog.tsx`: a "Title" input and a "Description" textarea.
3. `csv.ts`: the statement column is the title; a long line keeps its full text as the description (`splitTitle`, pure, with a test).
4. `import-page.tsx`: the column map and the preview speak of the title.
5. i18n: `label_title` in both catalogs.

### Docs

`GLOSSARY.md` (Title), the domain design (D15, the `transaction` row, the import section), `docs/screens.md` (the `/transactions` row).

## Out of scope (follow-ups)

- Search over the description.
- A title generated from the counterparty or the category (the fallback stays the category name).
- Markdown or rich text in the description.

## Done when

`pnpm check-types && pnpm test && pnpm build` pass, a movement with a title and a description shows the title in the list and both in its detail sheet, and the movements recorded before the change keep their label.
