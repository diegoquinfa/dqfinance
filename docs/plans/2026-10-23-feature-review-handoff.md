# Session handoff — 2026-10-23: the ten features under four review lenses

Read first: [AGENTS.md](../../AGENTS.md), the [proposals handoff](./2026-10-22-proposals-handoff.md) (the fix batches
and what they closed), and the [domain design](./2026-10-18-finance-domain-design.md).

This document is an addendum: the previous handoff tracks the blockers and their fixes; this one is what four
independent review lenses found in the shipped features after those fixes.

## Method

Four reviewers, one per lens: **readability**, **reliability**, **resilience**, **risk**. Their sessions had no
shell, so every finding is a static read of the code; none of them ran the tests. Findings I confirmed myself are
marked **verified**; the rest are **reported** with their evidence path. No code was changed in this pass.

## What bites today (verified)

| # | Where | Effect |
| --- | --- | --- |
| 1 | `apps/api/src/features/balance-adjustments/adjust-balance.ts` | `adjust_balance` is the only money write that never calls `assertCurrencyEnabled` (19 other call sites do). An agent can leave debt in a currency the user never enabled, and the card total ignores it while the tool answers as if it applied. |
| 2 | `apps/api/src/features/budgets/list-budgets.ts:68,73` | Spend is matched by `${categoryId}\|${currency}`, so a budget set in a second currency reports `spent: 0` against movements in the primary one — on REST and on MCP. |
| 3 | `apps/api/src/features/webhooks/check-due-bills.ts:43` | The query takes `nextDueOn >= today`. A bill that fell due while the app was closed, or while every delivery failed, is never announced again; `PATCH /webhooks/check` is the only trigger and there is no `scheduled` handler. |
| 4 | `apps/api/src/features/transactions/search-line.ts:19` | The one-line result an agent reads slices the ISO instant, so it prints the **UTC** day: a 21:00 movement on the 30th reads as the 1st. The list, the calendar and the budgets all use the user's day. |
| 5 | `apps/web/src/features/transactions/transactions-page.tsx:146` | "Date to" is sent unchanged while `day-filter.ts` makes the end exclusive: filtering 1–31 October drops every movement on the 31st, from the list and from the totals. |
| 6 | `apps/api/src/features/spending/get-forecast.ts:49` vs `safe-to-spend.ts:79` vs `calendar-days.ts:62` | The same recurring bill, overdue, is counted in full by safe-to-spend, dropped by the forecast and shown only as the next cycle by the calendar. One screen, three answers. |

## Money

- **`available` means two amounts.** The pure rule documents `availableCents` as "money in hand", but
  `get-safe-to-spend` passes hand + expected income before payday + future installment shares; the response field
  `available` is the hand only. The header formula in `safe-to-spend.ts` names two of its four inputs. (reported)
- **Two functions named `monthlySetAside`** with different arithmetic (`recurring-expenses`: a twelfth of a yearly
  bill; `savings-goals`: remaining/months), both summed into one `setAsidesCents`. (reported)
- **`yearlySetAsideCents` cannot tell a yearly bill from a monthly one**: it takes `Pick<Bill, 'amountCents' |
  'nextDueOn'>[]`, and the `frequency === 'yearly'` filter lives in the caller 35 lines down. (reported)
- The installment arithmetic itself is sound: one rule (`installmentShares`/`futureShares`/`shareInMonth`), tested,
  remainder in the first month.
- The budget/safe-to-spend month query is written twice; the upper bound was added to budgets only, and the copy in
  safe-to-spend still has no upper bound. (reported; the divergence is real in the code)

## Dates

- The **web writes the device day** (`shared/dates.ts` `today`/`dayToIso`/`isoToDay`) while every summary reads
  `user_settings.timezone`, and onboarding stores the zone with no way to change it later
  (`update-settings.ts` has no `timezone` field, while `settings.tools.ts` tells agents it is changed in the web).
  Travel, or a device in another zone, moves money between budget months. (reported, arithmetic shown)
- `shiftDay`/`addDays` are the same function written twice (`calendar/` and `expected-incomes/`), with the same
  non-obvious `Date.UTC` guard copied in both; `monthPeriod` exists and is re-derived by hand in two files;
  `monthsLeft` re-derives `monthsBetween`. (reported)
- `incomePeriod`'s "everything on or before the payday" is implemented as equality against the sorted first item.
  (reported)

## Webhooks and reminders

- The signature is sent as `sha256=<hex>`, but the domain design says the header "carries the HMAC" without the
  prefix; a receiver written from the doc never matches. (reported)
- `POST /webhooks/check` is a write behind a read-looking path: it delivers to third parties and stamps
  `notifiedOn`, with no rate limit and no cap on how many hooks a user can create. (reported)
- `failures[]` is built, returned and discarded by the web; a failing endpoint retries in silence. (reported)
- `secretLast4` discloses four characters of a secret that may be only eight long. (reported)
- The hint says the app calls the URL "when a bill falls due"; the only trigger is opening the app.
  (reported)

## Agent surface

- `searchLine` joins user free text with ` | ` and newlines unescaped into the whole tool payload: a crafted title
  can forge extra records for the agent reading it. (reported)
- `installmentMonths` is accepted on an income and then ignored by budgets and safe-to-spend. (reported)
- `list_budgets` returns `categoryId` without a name, so an agent needs a second call to label its own rows, and the
  web prints a UUID until the categories query resolves. (reported)

## User-facing strings that lie

- **"You spent more than you had"** is painted whenever `allowed < 0`, which also happens when the monthly target
  is exceeded (`allowed = min(daily, targetDaily)`) or the pending bills exceed the money: the card asserts a fact
  about the user's money that is not true. (reported, tests quoted)
- **`incomes_delete_hint`** says "the movements it produced stay"; expected incomes never produce movements.
  (reported)
- The installments row shows a **credit** next to "Fixed bills still due" with no sign, so it reads as debt.
  (reported)
- `webhooks_hint` promises delivery a bill-reminder system cannot make without the app open. (reported)

## Tests and harness

Verified by the reliability lens, and consistent with what I saw while building the shim:

- **Six callers have no test that executes their query**: `getSafeToSpend` (single-user fixture, so losing the
  `userId` filter passes), `listGoals`, `checkDueBills`, `getForecast`, `mergeCategories`, `deleteCategory`. Their
  pure helpers are covered; the queries are not.
- `search-filter.test.ts` asserts bound parameters only: swapping `and` for `or`, or the `like` operands, keeps it
  green.
- The D1 shim (`apps/api/src/test/fake-d1.ts`) **is not faithful enough for the claims around it**: `batch` is
  `Promise.all`, so a mid-batch failure commits; and it never enables `PRAGMA foreign_keys`, so the `restrict` /
  `cascade` guards the merges rely on cannot fail in a test.
- The two DB tests build their fixture from the real clock (`todayIn`), so what they cover changes with the host
  date while the assertions stay green.
- No CI workflow and no `forbidOnly`: a committed `test.only` would shrink the suite silently.

## Naming and dead code (readability lens)

- `webhooks.ts` holds six exports (input, view, create/list/delete) where `CODING_STANDARDS.md` asks one file per use
  case; the sibling features comply.
- The routes for expected incomes and savings goals are `/api/incomes` and `/api/savings`, while the feature
  directories and the MCP tools are `expected-incomes` / `savings-goals`: three names per feature.
- Dead: `transaction_installments_badge` in both catalogs, `TransactionListItem` exported and unused.
- `safe-to-spend-card` hardcodes the cache key `['safe-to-spend']` in six places, and `['forecast']` is never
  invalidated, so recording an expense leaves both overview numbers stale.
- The search debounce re-implements `useDebounced(300)` by hand (two effects and a ref), in a file that already
  imports the shared one.

## Operational (unrelated to the review)

`pnpm dev` still cannot start on this machine: `workerd` dies with
`CreateDirectory: #5 Acceso denegado.; path = miniflare-email-store` while `miniflare` builds the email Durable
Object store. Reproduced with the stale dev servers killed, all 113 `miniflare-*` temp dirs deleted, the email
binding commented out, and the store directory pre-created in every candidate cwd. `pnpm build`, `pnpm check-types`
and `pnpm test` pass from the root (the scripts no longer go through turbo, which cannot spawn pnpm here).

## Priority

1. **Money correctness**: the currency guard on `adjust_balance`; the budget/spend currency match; one answer for an
   overdue bill across safe-to-spend, forecast and calendar.
2. **Wrong data on screen**: the "Date to" bound, the search line's day, the "spent more than you had" copy.
3. **Silent failures**: the import error surface, the lost overdue reminder, the discarded `failures`, the
   lead-days field writing on every keystroke (a transient `0` turns reminders off).
4. **Tests**: close the six query gaps with the D1 shim once `batch` and `PRAGMA foreign_keys` are faithful; inject
   the clock in the two DB tests.
5. **Naming and dedup**: `monthlySetAside`, `available`, `shiftDay`/`addDays`, the triplicated occurrence walk, the
   `webhooks.ts` split, the route names.

None of this is a blocker for what the app does today; item 1 changes numbers a user reads.
