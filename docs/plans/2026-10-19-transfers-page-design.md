# Transfers page readability

Date: 2026-10-19. Status: approved.

## Problem

A transfer row read "Principal → Servicios" plus a long badge ("Entre mis cuentas, mismo banco"). Two accounts of different banks looked the same, and the account name says less than the bank it belongs to. The badge repeated what the row should show.

## Decision

**The bank is the headline of a transfer row.** The list endpoint returns, for each side, the bank name and the last 4 of the bank account, so the page never has to guess.

- A side is a **product**: headline = bank name, detail = product name + `•••• 1234`.
- A side is a **cash wallet**: headline = the wallet name, no bank (there is none).
- A side is a **card**: headline = the bank of the card's product, detail = the card name + `•••• 1234`.

Row layout (hairline row, hairline rules per DESIGN.md):

```
Bancolombia  →  Nequi                                          2.999 COP
Principal •••• 9845  →  Principal •••• 8554
19 OCT 2026 / COMISIÓN 500 COP / ENTRE MIS CUENTAS, OTRO BANCO
```

- Bank names in `ink` at 16px (weight 500), the arrow in `faint`.
- Account names and metadata in `label-mono` `muted-foreground`.
- Amounts stay right, the received amount below when the currency differs.
- The transfer type stays as a mono badge, but it is no longer the only clue to the banks.
- The metadata line separates its items with ` / `, and the badges are the last item, so they wrap to their own line on a narrow screen.
- The masked last 4 is `••••` (four bullets), the same as everywhere else in the app.

## API

`GET /api/transfers` returns `from.bankName`, `from.last4`, `to.bankName`, `to.last4` next to the existing fields (null where they do not apply: cash wallets have no bank).

## Not built

- Filters by bank or by direction.
- A grouped view per month.
