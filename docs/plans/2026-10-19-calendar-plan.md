# Calendar: analysis and plan

Date: 2026-10-19. Status: proposed.

## Goal

One month grid that answers "what did I spend on which day, and what is coming". Past days show what moved; today and later show the recurring expenses due.

## What exists

- **Past:** `transaction.occurred_at`. `GET /api/transactions` caps at 200 rows, so a month cannot be built from it; `summarize-transactions.ts` sums per currency but not per day.
- **Future:** only `recurring_expense` (`next_due_on`, `frequency`, `starts_on`). `nextDueDate()` already steps one occurrence forward, clamped to the month end. Movements cannot be future-dated (the forms set `max={today()}`), so there is nothing else to project.
- **Days:** `todayIn(timeZone, date)` in `apps/api/src/shared/dates.ts` turns any instant into the user's calendar day.
- **UI:** no calendar component. Date fields are native `<input type="date">`. `formatCompact` in `shared/money.ts` already gives "150 mil".

## Decisions

- **No new dependency, no shadcn `Calendar`.** shadcn's `Calendar` is `react-day-picker`, a date *picker*: small cells, built for selecting, not for showing amounts per day. The grid is seven columns of CSS grid and `periodRange('month', offset)` already gives the bounds. Revisit only if a date picker is wanted for the forms (then shadcn `Calendar` + `Popover` is the right tool there).
- **Aggregate on the API, in the user's timezone.** SQLite cannot group by an IANA zone, so the use case reads the month's rows (type, amount, currency, occurred_at) and folds them in JS with `todayIn(settings.timezone, occurredAt)`. A month is bounded, so no limit is needed.
- **Expenses and incomes only.** Transfers and adjustments are never income or expense (D3), so they stay out of the day totals.
- **Per currency.** Money never mixes currencies: a day holds one total per currency; the cell shows the primary currency, the day panel shows all.

## Plan

### API: `features/calendar/` (or inside `transactions/`)

1. Pure `projectDueDates(item, from, to)`: repeats `nextDueDate` from `nextDueOn` while `< to`, returns the days `>= from`. Only active items. Test it (weekly crossing months, Jan 31 monthly, yearly, item starting after `to`).
2. Pure `groupByDay(rows, timeZone)`: `{ day, currency, spent, received }[]`. Test it (a 23:30 movement in Bogotá lands on its local day, not UTC).
3. `getCalendar(db, userId, { from, to })`:
   - movements in range (reuse `transactionFilters`, `movementAmount`, `movementCurrency` so a foreign card charge counts in the card's currency, like the summary), grouped by day;
   - recurring expenses projected over `max(from, today)`..`to`, each `{ day, id, name, amount, currency, source }`.
   - every query filters by `userId`.
4. `GET /api/calendar?from&to` with `requireSession`; range capped at ~62 days.
5. MCP tool `get_calendar` (same input) only if useful to agents; otherwise skip.

### Web: `features/calendar/`

1. `routes/_app/calendar.tsx` with `?month=` offset in the URL (like the period block on the overview: previous / next).
2. `calendar-page.tsx`:
   - header: month name, prev / next, and the month totals (spent, received, still due).
   - grid: weekday row (Monday first, as `periodRange` uses), 7 columns, hairline borders, square cells. A cell shows the day number (mono), the day's spent as `formatCompact` in `ink` with `−`, received in `income` with `+`, and a muted marker with the amount for recurring items due. Today is marked with `signal`. Days outside the month are `faint`.
   - mobile: same grid with smaller cells showing only a marker / compact amount; the day panel does the rest.
3. Day panel (below the grid, or a `Dialog` sheet on mobile): that day's movements via the existing `GET /api/transactions?from=day&to=day+1` and `TransactionRow` (which already opens the detail sheet), then the recurring items due that day with a link to `/recurring`.
4. Nav: add "Calendar" to the desktop / menu links in `_app.tsx`; leave the bottom bar as it is (four items).
5. i18n strings in `@dqfinance/i18n`; a screen-reader label per cell ("Oct 14: spent 45.000 COP, 1 payment due").
6. `docs/screens.md`: add the `/calendar` row.

## Out of scope (follow-ups)

- Credit card payment day (`card.due_day`) as a due marker with the current debt as an estimate.
- Week view, heat-map shading, category filter.
- Projected balance per day (balance today minus what is due).

## Done when

`pnpm check-types && pnpm test && pnpm build` pass, and the month grid matches the `/transactions` list for the same days.
