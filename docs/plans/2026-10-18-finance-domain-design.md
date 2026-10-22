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
| D14 | A **pocket** is a product with `type = 'pocket'` and a `parent_product_id`: the product it sets money aside from. Its rules: the parent is a non-pocket product of the same user, the same bank account and the same currency, one level only; cards cannot belong to a pocket; a product with pockets cannot become a pocket, and a pocket's type cannot change. Every product also has a `yield_payout` (`daily` \| `monthly`), how often its interest is paid. | Colombian accounts let people set money aside inside one account ("home services", "transport"), each with its own effective annual rate. |
| D15 | A transaction has a **title** (≤ 120 characters, the short label that names it in every list) and a **description** (≤ 2 000 characters, the details shown in its detail sheet). An empty title falls back to the category name. The title is what a statement gives a movement; a statement line longer than a title keeps its full text as the description. | One field doing both jobs forces a long title to name a movement, or details with nowhere to go. |

## Data model

All tables have `id` (text UUID, except where noted), `user_id` (FK → `user`, cascade), and `created_at`. Money columns are integer cents (`*_cents`). Currency columns are ISO 4217 codes.

| Table | Columns | Notes |
| --- | --- | --- |
| `user_settings` | `user_id` (PK), `country`, `locale`, `timezone`, `primary_currency`, `spending_target_cents?`, `reminder_lead_days?`, `onboarded_at` | Written by the onboarding wizard. `spending_target_cents` is the monthly cap safe to spend applies; `reminder_lead_days` is how many days before a bill falls due the app warns (null: no warning). |
| `user_currency` | (`user_id`, `code`) PK | The user's currencies; always includes `primary_currency`. |
| `bank` | `name` | Colombian users pick from a catalog; others type the name. |
| `bank_account` | `bank_id`, `name`, `last4?` | |
| `product` | `bank_account_id`, `type` (`savings` \| `checking` \| `payroll` \| `investment` \| `other` \| `pocket`), `name`, `currency`, `annual_rate_bps?`, `parent_product_id?`, `yield_payout?` | A **source**. `annual_rate_bps` is the effective annual rate (E.A.) in basis points (10000 = 100%); it only feeds an estimate, never a balance. A **pocket** (`type = 'pocket'`) sets money aside inside its `parent_product_id`: same bank account, same currency, one level (D14). `yield_payout` is `daily` \| `monthly`, how often the interest is paid. |
| `cash_wallet` | `name`, `currency` | A **source**. Several allowed (COP wallet, USD wallet). |
| `card` | `product_id`, `kind` (`debit` \| `credit`), `name`, `last4?`, `credit_limit_cents?`, `statement_day?`, `due_day?`, `brand?`, `interest_rate_bps?`, `interest_rate_period?`, `color?` | A **source**. Currency = its product's currency. `brand` is `visa` \| `mastercard` \| `amex` \| `diners` \| `other`; `interest_rate_period` is `monthly` (MV) or `annual` (EA), and the rate belongs to a credit card. `color` is presentation only. |
| `category` | `name?`, `kind` (`expense` \| `income`), `system_key?` | System categories (`fx_loss`, `fx_gain`, `bank_fees`, `other_expense`, `other_income`) have a key and no stored name; the name is translated on read. An import row without a category is booked in `other_expense` / `other_income`. |
| `counterparty` | `name`, `kind` (`person` \| `business`) | |
| `transaction` | `type` (`income` \| `expense`), `amount_cents`, `currency`, **source** (`product_id?` \| `cash_wallet_id?` \| `card_id?`), `primary_amount_cents?`, `category_id`, `counterparty_id?`, `recurring_expense_id?`, `transfer_id?`, `title?`, `description?`, `installment_months?`, `occurred_at` | `primary_amount_cents` only for a credit-card charge in a foreign currency. `transfer_id` links the fee and FX entries a transfer created. `title` names the transaction in a list, `description` holds the details (D15). `installment_months` spreads an expense over the months it belongs to, for budgeting only: the movement keeps its date and its amount. |
| `transfer` | **from** (`from_product_id?` \| `from_cash_wallet_id?`), **to** (`to_product_id?` \| `to_cash_wallet_id?` \| `to_card_id?`), `sent_amount_cents`, `sent_currency`, `received_amount_cents`, `received_currency`, `fee_cents?`, `cost_basis_cents?`, `note?`, `sent_at`, `received_at?` | `cost_basis_cents` = purchase-day value released when paying foreign card debt. |
| `balance_adjustment` | **source** (one of three), `currency`, `observed_balance_cents`, `delta_cents`, `note?`, `adjusted_at` | For a card, the balance is the debt in that currency. |
| `recurring_expense` | `name`, `amount_cents`, `currency`, **source**, `category_id`, `counterparty_id?`, `frequency` (`weekly` \| `monthly` \| `yearly`), `starts_on`, `next_due_on`, `active` | Dates are calendar dates (`YYYY-MM-DD`) in the user's timezone. |
| `budget` | `category_id`, `amount_cents`, `currency` | One limit per category: `user_id` + `category_id` is unique. What the category may spend in a month; the spent is read from that month's expenses. |
| `savings_goal` | `name`, `target_cents`, `currency`, `target_date?`, `active` | What the user is saving for. With a `target_date`, what is left is spread over the months left and kept out of safe to spend; without one it asks for nothing. |
| `savings_contribution` | `goal_id`, `amount_cents`, `contributed_on` | What the user put into a goal; the goal's progress is their sum. `contributed_on` is a calendar date in the user's timezone. |
| `expected_income` | `name`, `amount_cents`, `currency`, `frequency` (`weekly` \| `biweekly` \| `monthly` \| `irregular`), `next_on`, `active` | The money the user expects. `next_on` is the anchor the occurrences count from (`YYYY-MM-DD`); the safe-to-spend period ends at the first one that arrives. |
| `webhook` | `url`, `secret`, `active` | A public https endpoint the app posts to when a bill falls due. The body carries an HMAC made with `secret`, which is never returned, only its last 4 characters. |
| `document` | **source**, `name`, `content_type`, `size_bytes`, `r2_key` | A file attached to a source (contract, terms, fee table), stored in the R2 bucket `DOCUMENTS` under a key namespaced by `user_id`. PDF or image, up to 10 MB. |

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

**History.** The same rules, applied to a ledger seen from a date: `computeBalancesAt` drops every movement after it (a transfer's `sent_at` and `received_at` are two dates, so in-transit money stays at the origin), and `assetsAndLiabilities` sums the result per currency. Month ends are calendar month ends in UTC, and the current month's point is "now".

**Yield estimate.** `balance × ((1 + rate)^(1/12) − 1)` a month and `balance × ((1 + rate)^(1/365) − 1)` a day, from `annual_rate_bps`. An estimate shown as "≈": the real interest arrives as an income or an adjustment (D2), never from this field.

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
- Known limit: paying from a source whose currency differs from the card's currency books no FX difference. An adjustment on foreign debt scales the cost basis at the average rate of the debt already outstanding, so the rate does not shift; with no debt in that currency there is no rate, and the units stay in their own currency, out of the card total.

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

## Statement import

One source, up to 500 rows, and a `dryRun` flag. Each row is `{ type, amount, occurredAt, title?, description?, categoryId? }`; `occurredAt` is a calendar date or an ISO datetime.

- **Duplicate:** same source, same type, same amount in cents, the same calendar day in the user's timezone (`user_settings.timezone`), and a title or a description both rows carry matches. Existing movements on those days and earlier rows of the same batch both count; the first occurrence wins.
- **Category:** the row's `categoryId` when given (its kind must match the type), else the system `other_expense` / `other_income`, translated on read.
- **dryRun:** returns every row with `duplicate`, `possibleDuplicate` and its resolved category, and writes nothing.
- **Write:** the non-duplicate rows in one multi-row INSERT, so D1 applies it entirely or not at all. Returns `{ created, skipped, rows }`. A row that only looks like one — nothing both rows carry says it is the same movement or a different one — is imported and flagged `possibleDuplicate`.

Agents parse the statement themselves and always preview first (`docs/mcp.md#importing-a-statement`).

## Documents

A file attached to a source: contract, terms, or fee table. PDF or a common image, up to 10 MB, in the R2 bucket `DOCUMENTS` under `user_id/random-id` (the object key never comes from the uploaded name). Rows live in `document` with the same three-nullable-FK source shape. The download route streams the object with its `Content-Type` and an attachment `Content-Disposition`, after the ownership check. Upload and download stay in the web app; agents only list them.

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
| `get_settings` | The user's country, language, timezone and enabled currencies; read-only |
| `list_accounts` | Every source with its id, currency, and balance or debt |
| `get_balance_history` | Month-end assets and card debt per currency, optionally for one source |
| `create_bank`, `create_bank_account`, `create_cash_wallet` | A bank and an account in it, or a cash wallet, so an agent can set up a source end to end |
| `create_product`, `update_product`, `create_card`, `update_card` | The setup fields an agent needs, including the annual rate, the yield payout, the parent product of a pocket, brand, interest rate, and color |
| `list_categories`, `create_category`, `update_category`, `delete_category`, `merge_categories` | Categories to record movements with, and reshaping them: rename and mark, delete an unused one, or merge one into another of the same kind; `includeSystem` adds the FX-difference and fee ones |
| `list_contacts`, `get_contact`, `create_contact`, `update_contact`, `delete_contact` | Contacts, and one contact's totals by category and month |
| `create_transaction`, `list_transactions`, `summarize_transactions` | Record, query and total income and expenses |
| `search_transactions` | Find a movement by its title, description or category, one line each, newest first |
| `update_transaction`, `delete_transaction` | Correct or remove a movement; the fee and FX entries of a transfer belong to it and cannot change on their own |
| `create_transfer`, `list_transfers`, `mark_transfer_received` | Move money between the user's own sources |
| `adjust_balance`, `list_balance_adjustments` | Set the real balance of a source; the last 100 corrections |
| `list_recurring`, `create_recurring`, `delete_recurring` | Manage subscriptions and bills; `pending: true` is the "to confirm" inbox |
| `confirm_recurring`, `skip_recurring` | Work the "to confirm" inbox |
| `get_calendar` | Per day of the user's timezone, what moved and what falls due (up to 62 days) |
| `import_transactions` | Record a whole statement at once, with a dry-run preview and duplicate detection |
| `list_documents`, `delete_document` | The files attached to the user's sources, and removing one |
| `list_expected_incomes`, `create_expected_income`, `delete_expected_income` | The money the user expects, and the day each one next arrives; safe to spend counts on them |
| `list_savings_goals`, `create_savings_goal`, `add_savings_contribution`, `delete_savings_goal` | What the user is saving for, what was put in, and what each goal asks every month |
| `safe_to_spend`, `forecast` | How much may be spent today; and the projected balance of each day until the month ends, with its lowest point |
| `list_webhooks`, `create_webhook`, `delete_webhook` | The user's own automation: the public https URL the app calls when a bill falls due, and the secret its signature uses |
| `list_budgets`, `set_budget`, `delete_budget` | A monthly limit per category, with what it spent and what is left |

Onboarding, changing settings, and uploading or downloading files stay in the web app; every other write is also reachable through the tools above. Scopes: `finance:read`, `finance:write`.

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
| `/savings` | Savings goals: what each holds, what is left and what it asks every month |
| `/incomes` | The money the user expects: amount, frequency and the next day it arrives |
| `/budgets` | A monthly limit per category, with what it spent and what is left of it |
| `/settings` | Language, currencies, categories, the webhooks the app calls when a bill falls due, and how many days before it warns |

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

Receipts/attachments, tags, statements/periods, exchange rates (automatic purchase-day values), loans and debts (uses Counterparty), recurring subscription detection, shared expenses, federated contacts and group projects. User requests behind these are in [2026-10-20-user-feedback.md](2026-10-20-user-feedback.md). The proposals still open are in [2026-10-21-feature-proposals.md](2026-10-21-feature-proposals.md); what shipped from that list is tracked in [odd/tasks](../../odd/tasks/).
