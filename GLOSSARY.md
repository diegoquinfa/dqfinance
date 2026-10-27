# Glossary

Domain terms used in code, docs, and reviews. Code uses the English term; the Spanish UI label is in parentheses.

| Term | Meaning |
| --- | --- |
| **Bank** (Banco) | A financial institution the user has accounts with. |
| **Bank account** (Cuenta bancaria) | The user's contract with a bank. Groups products. |
| **Product** (Producto) | A savings, checking, payroll, or investment product inside a bank account. Holds money in one currency. A **source**. |
| **Pocket** (Bolsillo) | A product that sets money aside inside another product of the same bank account and currency. One level only; it has its own annual rate and no cards. |
| **Annual rate** (Tasa efectiva anual, E.A.) | The effective annual rate of a product, stored in basis points. Feeds an estimate of what the balance earns; never a balance. |
| **Yield estimate** (Rendimiento estimado) | What a balance would earn in a month or a day at its annual rate. An "≈" figure, not money the user has. |
| **Yield payout** (Pago del rendimiento) | How often a product's interest is paid: daily or monthly. The rate is the same either way. |
| **Cash wallet** (Efectivo) | Physical money the user holds, in one currency. A **source**. |
| **Card** (Tarjeta) | A debit card (spends from its product) or a credit card (has its own debt). A **source**. Carries a brand, an interest rate with its period (MV = monthly, EA = annual), and a presentation color. |
| **Source** (Fuente) | Where money moves from or to: a product, a cash wallet, or a card. Stored as three nullable foreign keys with exactly one set. |
| **Balance** (Saldo) | Money in a product or cash wallet. Always computed from movements. |
| **Debt** (Deuda) | What is owed on a credit card, per currency. Always computed. |
| **Cut** (Corte) | The day a credit card's statement closes: what was charged until then goes on that statement. |
| **Statement** (Extracto) | What a credit card asks the user to pay after a cut, by its payment day. The user records it (the minimum, or more); the app never derives it from the debt. |
| **Transaction** (Movimiento) | An income or an expense on one source. Changes the user's net worth. |
| **Title** (Título) | The short label that names a transaction in every list, at most 120 characters. Empty falls back to the category name. |
| **Description** (Descripción) | The long free text of a transaction, with the details its title has no room for. Shown only in the transaction's detail sheet. |
| **Transfer** (Transferencia) | Moving the user's own money between two of their sources. Not income or expense. |
| **Transfer type** | Derived from origin and destination: own same bank, own other bank, withdrawal, deposit, cash exchange, card payment. |
| **In transit** (En tránsito) | A transfer that left its origin but has no received date yet. |
| **Fee** (Comisión) | Optional cost of a transfer, booked as a linked expense in "Bank fees". |
| **Primary amount** | Value of a foreign-currency credit card charge in the card's currency on the purchase day. |
| **Cost basis** | Purchase-day value of foreign card debt released by a payment. |
| **FX difference** (Diferencia en cambio) | Money gained or lost because foreign card debt was paid at a different rate than it was charged. Booked automatically. |
| **Balance adjustment** (Ajuste de saldo) | A correction to match the real balance. Stores the observed balance and the delta; never rewrites movements. |
| **Category** (Categoría) | What a transaction was for. System categories have a `system_key` and a translated name. |
| **Import** (Importación) | Recording a whole bank or card statement at once. Rows that already exist on the source are skipped; the preview is dry-run only. |
| **Document** (Documento) | A file attached to a source: contract, terms, or fee table. A PDF or an image, up to 10 MB, stored in R2. |
| **Counterparty** (Contacto / Comercio) | Who money went to or came from: a `person` or a `business`. |
| **Recurring expense** (Gasto recurrente) | A repeating expense that appears in the "to confirm" inbox when due. |
| **User currencies** (Monedas) | Currencies the user chose in onboarding; they limit every currency picker. |
| **Primary currency** (Moneda principal) | The user's main currency, chosen in onboarding. |
| **Guest** (Invitado) | A user with no email the person owns, created by the "Try the demo" button. Explores the app with the demo ledger; cannot connect an AI agent. Becomes a real account when it signs up, and keeps what it recorded. |
| **Demo ledger** (Demo) | The sample data a guest finds: six months of movements, a bank with two products, a cash wallet, a credit card, contacts, and three recurring expenses. Fixed, so every guest sees the same numbers. |
| **Landing** | The signed-out home at `/`: the promise, how it works, an assistant connected over MCP, the feature list, the real screens, and the way in. |
