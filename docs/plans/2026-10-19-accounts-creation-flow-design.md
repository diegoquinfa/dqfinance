# Accounts creation flow

Date: 2026-10-19. Status: approved, web only. No API or data model change.

## Problem

The accounts page showed every create action twice ("Add account" opened a dialog, "Add account →" the page), at three levels at once (bank account, product, card), plus three header actions. People had to think in four levels (bank → bank account → product → card) when they think "my savings at Bancolombia". A bank account without products rendered as an empty heading, and the bank name was the smallest text of its section.

## Decision

Hide the **bank account** level in the interface. The model keeps it (design D1-D13 unchanged): pockets and CDTs under one contract still need it.

### Accounts page

- Header: **New account** (outline, the page) and **Add cash** (link, the dialog). No "Add bank": the bank is created inside New account.
- Each bank is a `Section` with a prominent title: `// 01` eyebrow, the bank name in `type-heading`, and one "Add account →" link that opens New account with the bank chosen.
- Products sit right under the bank, with their bank account's last 4 as mono metadata. Cards stay nested with `↳`. Each product has one "Add card →" link.
- A bank account with no products is a row: its name, "No products", and "Add product →" (New account with that bank account chosen). A bank with no accounts says so.
- An empty page gets an action: "Create your first account".
- Every create action is a link to a page, on every screen size. The bank, bank account, product and card dialogs are removed; the cash dialog stays (two fields).

### New account page

In the order a person says it: an amount, a bank, a kind of account.

1. Opening balance, large, with the currency (unchanged).
2. **Bank**: one autocomplete. Suggests the user's banks, then the country catalog. A name matching one of the user's banks (case and accent insensitive) reuses it; any other name creates a bank. The hint says which will happen.
3. Only when that bank already has bank accounts: **"Does it go in an account you already have?"**, default "No, it is a new one". Preselected when arriving from "Add product →".
4. **Type** as chips: Savings, Checking, Payroll, Investment, Other.
5. **Name**, optional; the type is the placeholder and the fallback.
6. **Last 4** (only for a new bank account) and **annual rate**, both optional.

A new bank account is created silently, named like the product. The create chain and the partial-failure message are unchanged.

## Not built

- Totals per bank in the rail.
- Moving or merging products between bank accounts.
