# Finance domain design

Status: approved 2026-10-18. Terms are defined in [GLOSSARY.md](../../GLOSSARY.md).

## Goals

- Track where the user's money lives (bank products, cash, credit cards) and every movement between them.
- Work for any country and currency, with first-class support for Colombia (bank catalog, COP, `es-CO` formatting, dual-currency credit cards).
- Every operation is reachable by the web app and by AI agents (MCP) through the same use cases.
- Spanish and English from day one, in the API and the web.

## Decisions

| # | Decision | Why |
| --- | --- | --- |
| D1 | Balances and debts are **computed** from movements, never stored or overwritten. | One source of truth; editing a past movement can never desync a stored balance. |
| D2 | "Edit balance" in the UI creates a **balance adjustment** (observed balance + computed delta). | Fixes the balance without rewriting history; the correction stays visible and explainable. |
| D3 | Transfers and balance adjustments never count as income or expense in reports. | They move or correct the user's own money; they are not spending. |
| D4 | A **credit card** has its own debt balance; a **debit card** spends from its product. | Buying on credit does not reduce the savings balance; it increases debt. |
| D5 | Products and cash wallets hold **one currency**. A transaction on them uses that currency (not chosen). | Balances always add up without exchange rates. |
| D6 | A credit card's limit is in its product's currency; its **debt can be in several currencies**. A foreign-currency charge also stores its value in the card currency **on the purchase day**. | Matches dual-currency cards (common in Colombia) and single-currency cards alike. |
| D7 | Paying foreign-currency card debt records the **money sent and the units settled**. The difference against the average purchase-day cost is booked automatically as an **FX difference** expense or income. | The extra pesos paid at a worse rate are real money; reports must show them. |
| D8 | Transfer type (same bank, other bank, withdrawal, deposit, card payment) is **derived** from origin and destination, not stored. | A stored type can contradict the data after a correction. |
| D9 | Transfers have an optional **fee** (creates a linked expense in "Bank fees") and an optional **received date** (empty = in transit). | Interbank transfers cost money and can take a day to arrive. |
| D10 | People and businesses are one entity, **Counterparty** (`person` \| `business`). Sending money to a person is an **expense** with that counterparty. | Same role in a transaction; one foreign key; ready for loans later. |
| D11 | Recurring expenses **remind and wait for confirmation**; they never create transactions on their own. | No records of things that did not happen; variable bills get the real amount. |
| D12 | The user's **currencies** (chosen in the onboarding wizard) limit every currency picker. | A user in Colombia does not scroll through 300 currencies. |
| D13 | i18n lives in one shared package (`packages/i18n`, Paraglide) used by the API and the web. | One message catalog; the API translates errors and system category names. |

## Data model

All tables have `id` (text UUID, except where noted), `user_id` (FK → `user`, cascade), and `created_at`. Money columns are integer cents (`*_cents`). Currency columns are ISO 4217 codes.

| Table | Columns | Notes |
| --- | --- | --- |
| `user_settings` | `user_id` (PK), `country`, `locale`, `timezone`, `primary_currency`, `onboarded_at` | Written by the onboarding wizard. |
| `user_currency` | (`user_id`, `code`) PK | The user's currencies; always includes `primary_currency`. |
| `bank` | `name` | Colombian users pick from a catalog; others type the name. |
| `bank_account` | `bank_id`, `name`, `last4?` | |
| `product` | `bank_account_id`, `type` (`savings` \| `checking` \| `payroll` \| `investment` \| `other`), `name`, `currency` | A **source**. |
| `cash_wallet` | `name`, `currency` | A **source**. Several allowed (COP wallet, USD wallet). |
| `card` | `product_id`, `kind` (`debit` \| `credit`), `name`, `last4?`, `credit_limit_cents?`, `statement_day?`, `due_day?` | A **source**. Currency = its product's currency. |
| `category` | `name?`, `kind` (`expense` \| `income`), `system_key?` | System categories (`fx_loss`, `fx_gain`, `bank_fees`) have a key and no stored name; the name is translated on read. |
| `counterparty` | `name`, `kind` (`person` \| `business`) | |
| `transaction` | `type` (`income` \| `expense`), `amount_cents`, `currency`, **source** (`product_id?` \| `cash_wallet_id?` \| `card_id?`), `primary_amount_cents?`, `category_id`, `counterparty_id?`, `recurring_expense_id?`, `transfer_id?`, `description?`, `occurred_at` | `primary_amount_cents` only for a credit-card charge in a foreign currency. `transfer_id` links the fee and FX entries a transfer created. |
| `transfer` | **from** (`from_product_id?` \| `from_cash_wallet_id?`), **to** (`to_product_id?` \| `to_cash_wallet_id?` \| `to_card_id?`), `sent_amount_cents`, `sent_currency`, `received_amount_cents`, `received_currency`, `fee_cents?`, `cost_basis_cents?`, `note?`, `sent_at`, `received_at?` | `cost_basis_cents` = purchase-day value released when paying foreign card debt. |
| `balance_adjustment` | **source** (one of three), `currency`, `observed_balance_cents`, `delta_cents`, `note?`, `adjusted_at` | For a card, the balance is the debt in that currency. |
| `recurring_expense` | `name`, `amount_cents`, `currency`, **source**, `category_id`, `counterparty_id?`, `frequency` (`weekly` \| `monthly` \| `yearly`), `starts_on`, `next_due_on`, `active` | Dates are calendar dates (`YYYY-MM-DD`) in the user's timezone. |

**Source columns.** A source is stored as three nullable foreign keys plus a `CHECK` that exactly one is set. This keeps referential integrity in the database (no "type + id" text pairs).

**Currency rules.**

- Transaction on a product, cash wallet, or debit card: `currency` = the source's currency (derived; input ignored).
- Transaction on a credit card: `currency` ∈ the user's currencies. If it differs from the card's currency, `primary_amount_cents` is required.
- Transfer: `sent_currency` = origin currency. `received_currency` = destination currency, except for a credit card, where it is the debt currency being paid (any of the user's currencies).

## Balance rules

For a **product** or **cash wallet** `S` (single currency):

```
balance(S) = Σ income − Σ expense        (transactions on S, plus on S's debit cards)
           − Σ sent_amount               (transfers from S, from sent_at)
           + Σ received_amount           (transfers to S, only when received_at is set)
           + Σ delta                     (balance adjustments on S)
```

For a **credit card** `C`, debt per currency `k` (positive = owed):

```
debt(C, k) = Σ expense − Σ income        (transactions on C in k)
           − Σ received_amount           (received transfers to C in k)
           + Σ delta                     (adjustments on C in k)
```

Card total in its own currency = debt in its currency + Σ over foreign currencies of their **outstanding cost basis**.

**In transit** = Σ `sent_amount` of transfers with no `received_at`, shown per currency on the overview.

## FX difference on card payments (D7)

For a payment of `paid_units` of foreign currency `k` on card `C`, sent from a source in the card's currency:

```
outstanding_basis = Σ primary_amount (charges in k) − Σ primary_amount (refunds in k) − Σ cost_basis (earlier payments in k)
outstanding_units = debt(C, k)
released_basis    = round(outstanding_basis × min(paid_units, outstanding_units) / outstanding_units)
difference        = sent_amount − released_basis
```

- `difference > 0` → expense in `fx_loss`; `difference < 0` → income in `fx_gain`; `0` → nothing.
- The transfer stores `cost_basis_cents = released_basis`. The transfer, its fee, and its FX entry are written in one `db.batch` (atomic on D1).
- Known limit: paying from a source whose currency differs from the card's currency books no FX difference. Adjustments on foreign debt change units without basis, which shifts the average cost.

## Transfer types (D8)

| From → To | Type |
| --- | --- |
| product → product, same bank | `own_same_bank` |
| product → product, different bank | `own_other_bank` |
| product → cash wallet | `withdrawal` |
| cash wallet → product | `deposit` |
| cash wallet → cash wallet | `cash_exchange` |
| product or cash wallet → credit card | `card_payment` |

## Recurring expenses (D11)

- Pending = `active` and `next_due_on ≤ today` (in the user's timezone).
- **Confirm** creates a transaction (amount and date editable, defaults from the recurring expense), links it, and advances `next_due_on`.
- **Skip** only advances `next_due_on`.
- Monthly and yearly advances keep the day of `starts_on`, clamped to the month's last day (Jan 31 → Feb 28 → Mar 31).

## Internationalization (D13)

- `packages/i18n`: Paraglide catalog, locales `en` (base) and `es`. Message functions take the locale explicitly on the server (`m.key({}, { locale })`), so no per-request global state on Workers.
- API locale per request: `Accept-Language` (the web always sends its current locale), falling back to `en`. MCP uses the user's saved `locale`.
- API errors: `{ code, message }`. `code` is stable for logic; `message` is translated.
- Default categories are created in the user's language during onboarding and are editable data. System categories are translated on every read.
- MCP tool descriptions stay in English (models handle it best); tool output is user data.
- Money and dates are formatted with `Intl` in the user's locale.

## MCP tools

| Tool | Purpose |
| --- | --- |
| `list_accounts` | Every source with its id, currency, and balance or debt |
| `list_categories`, `list_contacts`, `create_contact` | Lookups needed to record movements |
| `create_transaction`, `list_transactions` | Record and query income and expenses |
| `create_transfer`, `mark_transfer_received` | Move money between the user's own sources |
| `adjust_balance` | Set the real balance of a source |
| `list_pending_recurring`, `confirm_recurring`, `skip_recurring` | Work the "to confirm" inbox |

Setup (banks, accounts, products, cards) stays in the web app. Scopes: `finance:read`, `finance:write`.

## Web screens

| Route | Content |
| --- | --- |
| `/onboarding` | Wizard: country, language → currencies → done (seeds categories and a cash wallet) |
| `/overview` | Balances per source, card debts, in transit, "to confirm" inbox |
| `/transactions` | List with filters, new transaction form |
| `/transfers` | List with type labels, new transfer form, mark received |
| `/accounts` | Banks → accounts → products → cards, cash wallets, "Adjust balance" |
| `/contacts` | People and businesses |
| `/recurring` | Recurring expenses |
| `/settings` | Language, currencies, categories |

## Implementation order

Each step is a full vertical slice (API + MCP + web + tests), working before the next starts.

0. Base: `packages/i18n`, locale resolution, error envelope, fresh initial migration (nothing is deployed).
1. Onboarding wizard and user settings.
2. Banks, bank accounts, products, cash wallets, computed balances.
3. Categories and counterparties.
4. Cards (debit and credit, debt per currency).
5. Transactions v2 (source, category, counterparty, foreign-currency charges).
6. Transfers, card payments, FX difference, fees, in transit.
7. Balance adjustments.
8. Recurring expenses and the "to confirm" inbox.

## Later

Budgets, receipts/attachments, savings goals, tags, statements/periods, exchange rates (automatic purchase-day values), investments, loans and debts (uses Counterparty).
