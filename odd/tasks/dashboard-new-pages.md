# Dashboard create pages — restructure

Objective: the three signed-in create pages (`/accounts/new`, `/accounts/new-card`, `/accounts/new-pocket`)
read like the rest of the dashboard: the same header band, the fields grouped in numbered sections instead of
one flat list, and one form per page. Nothing new is invented and every field keeps its id and name. Branch
`new-distribution`; delivery is the working tree plus a verified build, no push or PR. Runner: pnpm from the
root.

## Specs

S1. `/accounts/new`: `01 Saldo inicial` (the large amount with its currency and hint), `02 Banco` (the bank
name, the existing account select when that bank has accounts, the last 4 when the account is new), `03
Producto` (the type chips, the product name, the annual rate). The header keeps the back link, the h1 and
Create, and Create and Cancel stay at the end of the form.

S2. `/accounts/new-card`: the live card face stays above the form; `01 Tarjeta` (kind, product, name, last 4)
and `02 Datos de la tarjeta` (brand, color, and for a credit card the rate with its MV/EA period, the limit,
the statement day and the due day). `CardDetailsFields` and the dialogs that share it are not changed.

S3. `/accounts/new-pocket`: `01 Monto` (the amount, its currency and hint), `02 Bolsillo` (name, annual rate,
and the payout chips once there is a rate).

S4. Every page keeps its queries, its partial-failure retry, its empty state, and the field ids and names the
submit reads. New strings exist in both catalogs; no new colors, radii or raw values. `docs/screens.md`
matches each page.

S5. Verification: `pnpm check-types`, `pnpm test`, `pnpm build` pass; each page is rendered in the local
harness at 1440, 1280, 1024 and 390 with no horizontal overflow, axe wcag2a/2aa reports 0 violations, and the
heading order stays h1 > h2.

## Tasks

| ID | Spec | Route | State |
| --- | --- | --- | --- |
| T1 | S1 | inline | done |
| T2 | S2 | inline | done |
| T3 | S3 | inline | done |
| T4 | S4, S5 | parent | done |

## Log

L1 (goal, verbatim): "Reestructurar todos las paginas del dashboard actual que falta, si hace falta juntar
contenido, se hace. Siempre validar ui, diseño, accesibilidad y que sea facil de entender."

L2: the three create pages were the only signed-in routes left (the 13 list and detail routes closed in
`odd/tasks/dashboard-pages.md`). They already shared one header (back link, h1, Create in the action column)
and one form with `FieldGroup` fields, but the fields were one flat list in a `max-w-2xl` block, so nothing
told the user that an account is really bank + bank account + product. They now use the same `Section` rail as
the rest of the dashboard, with the fields in a `max-w-xl` group inside the content column (the settings page
precedent) and Create/Cancel kept at the content column's offset at the end.

L3: `/accounts/new` is `01 Saldo` (the opening balance, still first and large, with its bottom line), `02
Cuenta bancaria` (bank, the existing account select when there is one, and last 4 for a new one) and `03
Producto` (type chips, name, rate). The last 4 moved into 02: it belongs to the bank account, not the product.
Labels avoid repeating the field label under them: the section is `Saldo`, the field stays `Saldo inicial`.

L4: `/accounts/new-card` moved the live card face inside `01 Tarjeta`, where it previews the card those fields
describe; above the form it hung off the rail column and broke the grid. `02 Datos de la tarjeta` holds
`CardDetailsFields` unchanged, so the dialogs that share it are untouched, and the credit-only fields stay
inside 02 (no numbering gap for a debit card). `/accounts/new-pocket` is `01 Monto` and `02 Bolsillo`.

L5: mistake worth remembering: the repository has **no** prettier config (the root script exists, the config
does not), so `pnpm exec prettier --write` rewrote all three files to prettier defaults (semicolons, double
quotes, 80 columns), a 738-line diff of pure churn. Reverted with `git checkout --` and the files were edited
by hand in the house style: single quotes, no semicolons, long lines allowed.

L6 (evidence): the harness gained `?page=new-account|new-card|new-pocket`. Rendered at 1440/1280/1024/390 with
0 horizontal overflow; axe wcag2a/2aa 0 violations at 1440 and 390; headings are `h1` plus numbered `h2` with
no `h3`. The credit branch was rendered by switching the kind select (`Tasa`, `Cupo`, `Día de corte` and `Día
de pago` inside 02) and the payout chips by typing a rate (`Paga | Diario | Mensual`). `pnpm check-types`,
`pnpm test`, `pnpm build` pass. `docs/screens.md` rows rewritten for the three routes.
