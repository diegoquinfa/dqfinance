# Migarra demo analysis — feature gaps for DQFinance

Read-only research, 2026-11-06. Source: the public demo at <https://www.migarra.app>, explored with agent-browser
in a named session (`migarra-75279dea2a84`), desktop 1264 px viewport. Every screenshot is listed in §6. Nothing
here is a commitment; §4 is ordered by value per unit of work.

## 1. What the demo is

Garra (`migarra.app`) is a Spanish, EUR-only personal-finance web app in open beta ("Gratis · en beta"), built
around net worth rather than a ledger: accounts, investments, physical assets and debts roll into one figure
("Patrimonio completo"). The guest entry is "Probar la demo sin cuenta"; it drops a fixed fictional ledger into
the app behind a banner ("Estás viendo una demo · Datos ficticios: toca lo que quieras, nada se guarda").
Left rail holds 8 destinations plus demo utilities (feedback, "Ocultar cifras", "Modo claro"). A persistent
"+ Nuevo movimiento" opens the same quick-add sheet everywhere.

| URL | Name | Purpose |
| --- | --- | --- |
| `/` | Landing | Value props, 3 steps, FAQ, demo CTA |
| `/dashboard` | Inicio · Resumen | 4 KPI tiles, pace forecast, alerts, income-vs-expense chart, net-worth line, score, composition, goals |
| `/transactions` | Movimientos | Month table with inline cell edit, bulk select, filters, search, import, export |
| `/agenda` | Gastos fijos | Fixed incomes/expenses by day, fixed-vs-variable split, 30-day forecast, confirm queue |
| `/cuentas` | Cuentas | Accounts grouped by bank, composition bar, search + type filter |
| `/cuentas/demo_acc_inversion` | Account detail | Balance, lifetime in/out, movement table, copy ID, edit |
| `/cuentas#metas` | Metas | Savings goals tied to an account, aggregate progress KPIs |
| `/inversiones` | Inversiones (Beta) | Positions with units, cost/unit, market price, gain, allocation, contributions |
| `/patrimonio` | Patrimonio | Net worth = accounts + investments + assets − debts, with value history |
| `/analytics` | Analíticas | Period KPIs, wealth milestones, wealth snapshot history, balance table, category/account/budget/day views, habits, "cambios del mes" |
| `/configuracion` | Configuración | Categories CRUD, iPhone shortcut, data export (gated), danger zone |
| `/login` | Entra en tu cuenta | Email/password, magic-link reset, "Ver la demo" |

Not found: `/metas`, `/calendario`, `/asistente`, `/sign-up` (404 or redirect to `/login`) — there is no calendar,
no assistant/AI screen, and no reachable onboarding in the guest demo.

## 2. Feature inventory

**Capture.** Quick-add sheet: type chips Gasto / Ingreso / Traspaso, amount first, quick-amount chips (10/20/50/100 €),
frequent-category chips + "Más…" + "Nueva", source select labelled with its balance, collapsible details
(day/month/year spinners, Hoy/Ayer, title, **Necesidad / Deseo** toggle, "Repetir este movimiento" with
"Cada semana / Cada mes / Cada año"). Repeat creates an *Agenda forecast*, not money: "No cambia el saldo hasta que
confirmes que ya ocurrió". Movements table edits date, description, category and amount **in place**; row checkboxes
select for bulk actions; a "Tags" column carries markers (`recurrente`, `traspaso`, `traspaso:demo_tr_208`).
Import: account picker, CSV file, "Columnas del archivo (detectadas automáticamente)", per-row checkboxes,
"1 ya estaba en Garra (desmarcado)", sample statement.

**Plan.** Agenda: fixed incomes and expenses with day-of-month and source, "Vencidos / Requieren revisión" counters,
Ingresos/Pagos/**Previsión neta · 30 días**, and per-row "Ya se realizó" + delete. Fixed-vs-variable summary:
"71 % de tus gastos son fijos · 29 % variables" and "Gastos variables al mes (media 3 meses)". Goals: name, target,
deadline, **linked account**; progress is that account's balance ("El progreso se calcula solo con el saldo real de
esta cuenta"); KPIs are global progress %, remaining, closest goal, biggest effort, completed. Budgets exist as
"Presupuesto vs real" inside Analíticas, not as their own screen.

**Report.** Dashboard: Patrimonio / Gastado / Ahorro / Inversiones tiles with month delta, "A este ritmo acabarás
noviembre con +982,74 €", "Lo importante hoy" (next fixed bill, next step), income-vs-expense bars with click-through
to the period breakdown, net-worth line with peak annotation, **Puntuación financiera 20 "Frágil" — 1 de 4 puntos
clave cumplidos** (savings rate, positive flow, growing net worth, emergency fund), wealth composition by account,
"Racha de ahorro 7 meses", best month, emergency fund widget ("Define tu coste de vida"), year-to-date totals.
Analíticas: wealth milestones (30 000 / 50 000 / 100 000 €), monthly wealth snapshots taken on the 5th, balance
table per month, expenses by category / by account, budget vs actual, upcoming payments, calendar heat-grid of spend
per day, **Hábitos** (needs vs wants, 50/30/20 scored against targets in points), **Cambios del mes** (prose
sentences: "Supermercado bajó un 80% frente a tu media (307 € → 61,79 €)"). "Informe mensual PDF" button.

**Accounts, assets, debts.** Seven account types: Emergencia, Ahorro, Inversión, Efectivo, Gastos Mensuales, Cuenta
remunerada, Depósito a plazo. Bank picker with ~28 curated banks/brokers plus logo upload. Assets ("Otros bienes":
vivienda, coche) with dated value history; debts (hipoteca, préstamo) with monthly payment, TIN, % paid and a link to
the asset. Investments: units, cost/unit, market price, market value, gain, weight, allocation by type, monthly
contributions chart, "Añadir posición" — marked "Beta".

**Chrome.** "Ocultar cifras" masks every amount with one tap; "Modo claro" theme; "Enviar comentario" feedback;
per-page month navigator in the URL; "Exportar CSV"; "Copiar ID"; category CRUD (24 categories, income/expense/both,
edit + delete); gated "Atajo de iPhone" (log an expense in two taps without opening the app) and gated full JSON
export; "Borrar todos los datos".

## 3. Gap analysis

DQFinance routes are confirmed in `apps/web/src/routes/`; "none" means no route, feature module or API carries it.

| Feature | Migarra does | DQFinance today | Gap | Value | Effort | Fits DQFinance principles |
| --- | --- | --- | --- | --- | --- | --- |
| Manual assets (house, car) | "Otros bienes" with dated value history | `/overview` net worth counts accounts + cards only (`features/balances/overview-page.tsx`) | No way to record what is not an account | High | M | Yes — a valuation is a stated fact with a date, like D2's observed balance; balances stay computed (D1) |
| Manual debts (mortgage, loan) | Principal, monthly payment, TIN, % paid, linked asset | Credit-card debt only (D4, D16) | Off-balance-sheet debt is invisible | High | M | Yes — D16 already weighs a card by its statement; a mortgage is the same idea with a fixed payment |
| Investment positions | Units, cost/unit, market price, gain, allocation | Products hold a balance and an annual rate (D14); no positions, no securities | Portfolio return is unmeasurable | Med | L | Partly — manual prices only; a price feed would import an outside opinion DQFinance never shows |
| Financial-health score | 20 "Frágil", 4 factors, points | none | none | Low | S | **No** — an opaque score competing with the numbers; DESIGN.md has no place for it |
| Needs vs wants per movement | Toggle on the quick-add sheet; 96 %/4 % and 50/30/20 in Analíticas | Categories only | Cannot separate a need from a want | Med | M | Yes — one more stored attribute like D15's title, reported in ink, never as a verdict |
| Emergency fund target | "Colchón de emergencia": cost of life × months vs balance | `/savings` goals, no cost-of-life input | "How many months am I covered" is unanswerable | Med | S | Yes — it is a savings goal with a computed target, feeding safe-to-spend (D16) |
| Wealth milestones ladder | 30 k / 50 k / 100 k with progress | none | none | Low | S | No — an invented ladder is a product opinion, not the user's goal |
| Monthly PDF report | "Informe mensual PDF" (button present; file not inspected) | none | Nothing to hand to a person or an accountant | Med | M | Yes — a read-only export of what the screen already shows |
| Fixed vs variable split | 71 % fixed, "media 3 meses" of variable spend | `/recurring` lists both, no split, no averages | Budgeting cannot see how much is committed | Med | S | Yes — a sum over existing rows, no new storage |
| 30-day agenda forecast | Ingresos / Pagos / Previsión neta · 30 días, overdue counters | `/recurring` has due-now + totals/month | No "where does this month land" figure | Med | S | Yes — same inputs as D16's forecast, framed per month |
| One-tap "Ya se realizó" | Confirms a bill from the agenda row | `/recurring` Confirm + Skip | Equivalent | Low | — | Already shipped (D11) |
| Movements CSV export | "Exportar CSV" on every table | none | Data is locked in | Med | S | Yes — read-only, no new model |
| Bank CSV presets | Auto-detected columns for BBVA, ING, Santander, CaixaBank, Sabadell, Revolut, N26, MyInvestor | `/transactions/import` asks for an explicit column map | Every import costs the same mapping work | Med | S | Yes — a preset is a map saved for a recognised header row |
| Inline cell editing | Edit date, description, category, amount in the row | `/transactions` opens a detail sheet, then Edit | Two clicks per correction | Med | M | Yes — same mutation, a shorter path |
| Bulk select | Checkbox column for multi-row actions | none | No batch delete or recategorise | Low | M | Partly — one action (delete) would be a start; batch anything else invents hidden state |
| Tags on movements | Free-form `Tags` column | Categories + counterparty + source | Overlaps categories | Low | S | **No** — a second taxonomy in a mono column competes with the category |
| Wealth snapshot history | A snapshot on the 5th, change since last and since the first | Net-worth chart reconstructed each load | Chart is rebuilt, not remembered | Low | S | Yes — one stored row per month, no derived balance |
| Per-account savings target | "Objetivos de tus cuentas" in Hábitos | `/savings` goals are separate from accounts | Goals cannot borrow an account's balance | Low | S | **No** as built — see §5, progress becomes a lie |
| Data export + delete-all | Full JSON copy, "Borrar todos los datos" | `/settings` has language, currencies, categories, notifications, password, webhooks, session | No exit and no copy | Med | S | Yes — DQFinance already stores documents in R2; an export is the same read |
| Privacy mode | "Ocultar cifras" masks all amounts | none | Amounts are always on screen | Med | S | Yes — a client-side display state, nothing stored |
| iPhone shortcut | "Apunta un gasto en dos toques desde el iPhone" | MCP + webhooks exist; no shortcut recipe | Capture needs the web app | Med | M | Yes — an authenticated write path through an existing token, no new surface |
| Narrative insights | "Cambios del mes" in prose | `/overview` shows figures, no sentences | The user must read the numbers | Low | M | Partly — one line under a section is fine; a feed of opinions is not |
| Theme / feedback widget | Light theme toggle, "Enviar comentario" | Dark only by design | Deliberate | — | — | **No** — DESIGN.md: dark only |

## 4. Recommendations, in order

1. **Manual assets and debts with dated value history.** A `net-worth` feature module plus a section on
   `/overview`; every valuation is a dated row (asset, value, day), every debt carries principal, payment, rate and
   the asset it secures. Nothing is a stored balance, so D1/D2 hold: the figure is summed on read from accounts,
   cards, valuations and debt principals. This is the gap that changes what the product answers.
2. **Needs vs wants on a movement, reported as 50/30/20.** Add one nullable attribute beside the category, a toggle
   in the quick-add sheet and the section on `/overview`. It reuses D15's precedent of a second small field and
   reports in `ink` with no colour verdict. It is also the input the emergency-fund and budget numbers want.
3. **Emergency fund as a computed goal.** One setting (monthly cost of life) plus a months target, rendering as a
   `/savings` goal whose target is computed, and as a term inside safe-to-spend (D16). Cheap, and it closes an
   anxiety the app currently cannot answer.
4. **Fixed vs variable split and a 30-day net forecast on `/recurring`.** A sum over existing recurring rows and the
   trailing three-month average of the rest; no new table, no new endpoint shape.
5. **CSV export and bank header presets.** "Exportar CSV" on `/transactions`, and a preset map chosen from the
   header row for the banks people actually use, in `/transactions/import`. Presets are data, not code paths.
6. **Privacy mode and a real exit.** A client-side "hide amounts" state (localStorage, never sent) and a JSON
   export + delete-all under `/settings`. Both are small, both are asked for by anyone who uses the app on a train
   or wants to leave.
7. **Inline editing in the movement list.** The detail sheet stays for the long tail; date, description, category
   and amount become editable in the row. Same mutations, fewer clicks, and it makes the list feel like the record
   it is.

Deliberately not recommended: the financial score, the milestone ladder, investment positions, tags, and the iPhone
shortcut. The first two are opinions, the third is a different product (prices, lots, a market feed), and the fourth
and fifth need design work DQFinance has not started (`docs/mcp.md` for the shortcut's token story).

## 5. What NOT to copy

- **The financial score.** "20 · Frágil · 1 de 4 puntos clave cumplidos" turns the app into a grader. DQFinance's
  premise is that nothing competes with the numbers (DESIGN.md, Principles 1 and 6); a score is a black box sitting
  where the balance should be.
- **Goals whose progress is a linked account's balance.** All three demo goals read 8 367,51 € of 3 500/6 000/1 200 €
  and the aggregate says 235 %: there is no contribution ledger, so progress is the account's luck. DQFinance's
  `/savings` records what was put in and is right to.
- **Recurring entries that post themselves.** The investments screen toasts "7 aportes periódicos aplicados". D11
  says a recurring expense reminds and waits; auto-posting would put money in the ledger that the user never saw.
- **Red expenses and green income as the primary signal.** DESIGN.md, Principle 2: expenses are `ink` with a minus;
  red is reserved for errors. Migarra's "gastos rojo" is exactly the reflex to refuse.
- **Tags beside categories.** `Tags` duplicates the category with less discipline and no totals.
- **"Ya se realizó" on rows dated in the future.** In the demo it is offered on 8-16 November and 1 December
  entries; the label presumes an event that has not happened. DQFinance's "Due now" list is the honest version.
- **A single-currency assumption.** Garra is EUR-only, so it never solves what DQFinance already does: per-currency
  totals with no FX rate (D5, DESIGN.md Principle 8). Adopting its model would delete a solved problem.
- **The KPI card grid, donuts and pastel composition bars.** Presentation, not function; the numbers-first rule and
  hairline rows already say no.
- **Invented wealth milestones (30 k / 50 k / 100 k).** A ladder the user did not ask for.

## 6. Evidence

Pages visited: `/`, `/dashboard`, `/transactions`, `/transactions` (import dialog + sample statement), `/agenda`,
`/agenda` (add fixed expense, transfer sheet), `/cuentas`, `/cuentas#metas`, `/cuentas/demo_acc_inversion`,
`/inversiones`, `/patrimonio`, `/analytics`, `/configuracion`, `/login`; 404 on `/metas`, `/calendario`,
`/asistente`, `/sign-up`, `/onboarding`.

Screenshots (all under `C:\Temp\shots\migarra\`, verified on disk): `01-landing.png`, `02-dashboard.png`,
`03-movimientos.png`, `04-nuevo-movimiento.png`, `05-agenda.png`, `06-cuentas.png`, `07-cuenta-detalle.png`,
`08-inversiones.png`, `09-patrimonio.png`, `10-analiticas.png`, `11-configuracion.png`, `12-importar.png`,
`13-importar-preview.png`, `14-metas.png`, `15-nueva-meta.png`, `16-puntuacion.png`, `18-modo-privacidad.png`,
`20-nueva-cuenta.png`, `21-nuevo-gasto-fijo.png`, `22-traspaso.png`, `23-login.png`.

Not verified, stated as such: the monthly PDF's contents (button present, no file inspected), the light theme (the
toggle was off-viewport), the "Resumen" disclosure on `/transactions` (listed "Indicadores, cuentas, objetivo de
ingresos, próximos pagos y cash flow" but did not expand), sign-up and onboarding (unreachable from the demo), and
bank synchronisation (the landing states there is none: "Sin conectar tu banco").
