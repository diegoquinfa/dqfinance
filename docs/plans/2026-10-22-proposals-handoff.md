# Session handoff — 2026-10-22: the ten proposals, the reviewer fixes, and what an independent review found

Read first: [AGENTS.md](../../AGENTS.md), [docs/architecture.md](../architecture.md),
[docs/screens.md](../screens.md), the [domain design](./2026-10-18-finance-domain-design.md) (D1–D13), and the
[feature proposals](./2026-10-21-feature-proposals.md).

## State

- Branch `fix/reviewer-findings` (HEAD is the last commit of this file), based on `main` at `538046a`. **Everything
  is local**: `git push` still answers 403 for `dquintana-kurbuo`; the `diegoquinfa` credential is not in this
  checkout.
- 35 commits over `main` at `538046a`: the 22 of the stack, the worktree setup, this handoff, and the 11 fix
  commits of the batch below. **Ten of the thirteen proposals are implemented**
  (1, 2, 3, 4, 5, 6, 7, 9, 11, 13). Not implemented: 8 (shared expenses), 10 (federated contacts) and 12 (group
  projects); 10 blocks 8 and 12, which are a whole protocol, not a screen.
- Working tree: `M skills-lock.json` and untracked `.agents/skills/handoff/` — the half-finished handoff work.
  Nothing of it is committed, and `.atl/skill-registry.md` has no `handoff` row.

## Gate

`pnpm` and `turbo` do not run inside the DSH sandbox (pnpm cannot open its store lock, turbo spawns a child and
gets EPERM). What was verified directly instead:

- API: every `src/**/*.test.ts` run directly with `node` → **260/260 pass** (the runner itself spawns and the
  sandbox denies it).
- Web: 29/29 pass. Root `scripts/`: 5/5 pass. `tsc --noEmit` in `apps/api` and `apps/web` → clean.
- i18n: `en.json` and `es.json` have the same 708 flat keys.
- **`pnpm build` was NOT verified**: `vite build` dies loading `@tailwindcss/oxide` (spawn EPERM). Run
  `pnpm check-types && pnpm test && pnpm build` outside the sandbox before any delivery.

## What landed

| Slice | Commit | What |
| --- | --- | --- |
| categories (P9) | `a385666` | rename, icon + color, delete, merge; `category-mark.tsx` |
| search (P11) | `b90a420` | search by title/description/category; compact MCP tool |
| safe-to-spend (P1) | `4cb1817` | "how much may I spend today", with a monthly target |
| yearly bills (P4) | `c5ec9cf` | a yearly bill reserves a twelfth every month |
| savings goals (P6) | `7142aee` | goals with contributions and progress (`/savings`) |
| expected incomes (P7) | `132df4b` | expected money; the period ends at the next payday (`/incomes`) |
| installments (P5) | `c290608` | spread an expense over N months |
| reminders (P3) | `113d2d9` | signed webhooks when a bill falls due, plus its plan `3d316d2` |
| forecast (P2) | `1209830` | day-by-day balance until month end, with the lowest point |
| budgets (P13) | `4438a85` | a limit per category, and what is left (`/budgets`) |
| hardening | `806c3d7` | rate limit, public-URL guard, Content-Disposition, LIKE escaping, conditional writes |
| readability | `49c785d` | dead i18n keys, dialog close label, `source-label` moved to `shared/` |
| day is an instant | `9d5a3a5` | `startOfDayIn` / `dayRangeIn` in `shared/day-range.ts` |
| foreign debt basis | `627c642` | scale a foreign-debt adjustment by the average rate of the live debt |
| day filters | `68f8d23` | list and summary read the day in the user's timezone |
| guest move | `6edb81d` | `move-guest-data` covers every table (20); a test scans the schemas |
| import | `3838095` | date-only rows land on the user's day; duplicates need positive evidence |
| MCP + cleanup | `6d3ab66`, `25b6947` | one round trip for source + timezone; the demo test speaks the guard |

## The independent review (7 read-only reviewers, 2026-10-22)

RDD is not installed in this runtime: `gentle-ai review status` cannot even resolve the repo root under the
sandbox. So this was a manual candidate validation — no receipt, no approval claim, ordinary policy. Seven
reviewers took one slice each; the blockers below were confirmed against the code (four by running a probe).

**Status after the fix batch: nine of the eleven code blockers and all three documentation blockers are fixed.**
#3 (the adjustment guard) and #11 (accent-insensitive search) remain open, both listed under "Still open" below.

### Blockers — code (11)

1. `apps/web/src/routes/_app.tsx:84-88` — the effect lists `check.isPending` / `check.isError` in its dependencies
   and calls the mutation: after every success `isPending` flips back, the effect re-runs and fires again. The app
   shell posts `POST /api/webhooks/check` in a loop for the whole session. Fix: a `hasRun` ref, or drop the
   mutation state from the deps.
2. `apps/api/src/features/webhooks/check-due-bills.ts:68-73` — `notifiedOn` is written even when there was no
   active hook or every call failed, and the query then excludes that due date forever. A failed endpoint loses
   the reminder with no report (`failures` is returned and discarded). Fix: mark only after a successful delivery,
   and surface the failures.
3. `apps/api/src/features/balance-adjustments/adjust-balance.ts:38-56` — the `expectedBalance` guard is a
   read-then-insert, not a conditional write (the repo already does it right in `mark-transfer-received.ts`). Two
   concurrent adjustments with the same expected balance both apply: 100 → two tabs submit 150 → 200.
4. `apps/api/src/shared/day-range.ts:34-40` — a zone that springs forward at 00:00 yields the **previous local
   day** (probe: Havana 2026-03-08 → 03-07 23:00, Santiago 2026-09-06 → 09-05 23:00, Azores 2026-03-29 → 03-28
   23:00). The import, the duplicate window and the day filter all inherit it, so the "day never shifts" fix fails
   exactly there. `day-range.test.ts` only covers New York (02:00 transition).
5. `apps/api/src/shared/public-url.ts:25-26` — the IPv4-mapped-v6 branch is dead: `new URL()` rewrites
   `::ffff:127.0.0.1` to `::ffff:7f00:1`, so the dotted regex never matches and the URL is accepted (also NAT64
   `64:ff9b::/96` and 6to4 `2002:…`). No live SSRF on Workers (no private egress), but the control does not
   enforce what it documents. Fix: parse the hex form, plus NAT64/6to4.
6. `apps/api/src/features/spending/get-forecast.ts:63-69` — `nextIncomeDate('irregular', …)` returns `today` for a
   past anchor, and the loop advances one day at a time, so an irregular income is added on **every remaining
   day**: 500,000 becomes 4,000,000 in October.
7. `apps/api/src/features/budgets/list-budgets.ts:32-49` — installments never reach the budget. A 600,000
   purchase over 6 months reports 600,000 spent (ratio 3.0 against a 200,000 limit) and 0 for the next five
   months, although the UI promises the opposite (`en.json:377`). Only safe-to-spend spreads the shares.
8. `apps/api/src/features/spending/income-period.ts:25-36` — an income dated **today** is counted in the period, so
   on payday `daysLeft` is 1 and the amount is added to a balance that already has it. Permanent for an irregular
   income, whose anchor is re-mapped to today on every read.
9. `apps/api/src/features/spending/get-safe-to-spend.ts:119-128` — the target cap divides the **raw** month spend
   while `availableCents` adds the future installments back: target 500,000 + a 600,000 purchase over 6 months
   → `(500,000 − 600,000) / 10 = −10,000` per day instead of 40,000.
10. `apps/api/src/features/categories/merge-categories.ts:43-55` — merge reassigns only `transaction` rows and
    then deletes the category. `recurring_expense.category_id` is `ON DELETE restrict` → the batch rolls back and
    the user gets a 500; `budget.category_id` is `ON DELETE cascade` → the user's limit disappears silently and
    the merge answers 200.
11. `apps/api/src/features/transactions/search-filter.ts:15-25` — plain SQLite `LIKE`, which folds ASCII case only
    and never accents: "educacion" does not find "Educación", and a system category (stored with `name = NULL`,
    translated on read) cannot be found by the name it shows. `odd/tasks/expense-search.md:40` promises accent
    tolerance.

### Blockers — documentation and handoff (3)

12. `odd/tasks/*.md` — the 11 documents added by this stack are plans, not handoffs: every task is `- [ ]`, none
    carries a commit id, none has `## Specs` (S#) or `## Log` (L1 = the request verbatim), and
    `statement-import.md` has no `## Tasks` section at all. The three older docs (`contacts`, `transactional-email`,
    `web-push-updates`) do have checked tasks with commit hashes; the regression is specific to this stack.
13. `docs/plans/2026-10-18-finance-domain-design.md:125` — still documents the duplicate rule as "same calendar day
    (UTC), and the same title when both rows have one". The shipped rule is the user's day and a title **or** a
    description, with unknown rows imported as `possibleDuplicate`. AGENTS.md makes this document the authority,
    so it reintroduces the bug `3838095` fixed.
14. `.agents/skills/handoff/` + `skills-lock.json` — the handoff skill was installed and never committed, and no
    handoff document was written anywhere (nothing in `docs/plans/`, nothing in `%TEMP%`). The repo's own handoff
    convention is `docs/plans/<date>-<slug>-handoff.md`, which is what this file restores.

### Advisories (22, worth a pass but not a stop)

- **Security**: `deliver-webhook.ts:22-31` follows redirects (only the first hop is validated);
  `check-due-bills.ts:70-73` updates by id without a `userId` filter (safe today, one input away from unsafe).
- **Timezone**: the "this month" windows in `get-safe-to-spend.ts`, `list-budgets.ts`,
  `get-counterparty.ts` and `installments.ts` are UTC instants while the rest of the branch reads the user's day.
- **Spending math**: weekly bills counted once, overdue bills excluded; a yearly bill subtracted twice in its
  due month; foreign card charges invisible to the sums; a backdated adjustment re-valued by later charges;
  `adjust-balance-dialog.tsx:69` prints the card-currency debt with the selected currency.
- **Categories**: `delete-category.ts:21-27` guards only transactions (a recurring bill still hits the FK);
  the merge target may be a system category; `list-transactions.ts:69-73` searches `category.name`, so system
  categories are unfindable by their displayed name.
- **MCP**: `transactions.tools.ts:51` says "use list_transactions for the detail of one" but there is no by-id
  lookup.
- **Guest (pre-existing)**: a guest signing **into an existing account** throws on the first conflicting row
  (`user_settings` PK), so the hook 500s and the guest is never cleaned up.
- **i18n**: `"{days} days before"` renders "1 days before".
- **Docs**: `/budgets` is missing from `docs/screens.md`; `architecture.md:67` says "Four dependencies" and lists
  six; `architecture.md:41` calls web `categories/` "only the query hooks" (it now ships `category-mark.tsx`);
  `docs/mcp.md:56,69` keeps the old tool count and duplicate rule; the domain design still lists the shipped
  proposals as future work; 10 `odd/tasks` docs link `../docs/plans/…` instead of `../../docs/plans/…`.

## What the fix batch changed (2026-10-22, after the review)

Eleven commits fix nine of the eleven code blockers and all three documentation blockers. Each commit carries its
own scope; the money, security and data ones were re-checked by an independent verifier.

| Commit | What |
| --- | --- |
| `83a16c8` | webhooks: a bill is announced only when a hook received it; `redirect: 'manual'`; a stable `X-DQFinance-Delivery`; the update filters by `userId` |
| `aac2fb6` | web: the due-bill check runs once per app open — a ref, and the mutation state out of the dependencies |
| `25b2e9a` | spending: an irregular income lands once; payday is strict; installments count by their share in the budget and in the cap; the month is the user's |
| `c90004f` | categories: merge moves transactions, recurring bills and the budget; delete refuses a category a bill still uses |
| `7a32a62` | shared: a day starts at the first instant that reads as that day (Havana, Santiago, Azores) |
| `db801e5` | shared: the private IPv6 forms `new URL` rewrites are rejected (mapped, NAT64, 6to4) |
| `53446e0` | docs: domain design, screens, architecture, mcp and the 11 task docs match the code |
| `bc8ccc3` | copy: `category_in_use` (409), truthful tool descriptions, `webhooks_lead_day`, the card-currency balance |
| `feba988` | test: the installment share pinned to the user month |
| `aa9a08f` | spending: every bill occurrence (weekly twice, overdue once), a yearly bill not doubled, the card-currency movement |
| `84fa474` | demo: the guest move survives a target that already owns settings, currencies and system categories |

Gate after the batch: **260 API tests, 29 web, 5 scripts, `tsc` clean on both apps, i18n 708/708**. `pnpm build` still
could not run in the sandbox.

Still open, deliberately:

- `apps/api/src/features/balance-adjustments/adjust-balance.ts` — the `expectedBalance` guard is still a
  read-then-insert; two concurrent adjustments both apply. Needs a conditional write or a written limit.
- Accent-insensitive search — SQLite `LIKE` folds ASCII case only and system categories store `name = NULL`. A real
  fix needs a stored normalized column plus every write path, or dropping the promise in
  `odd/tasks/expense-search.md:40`. Product call.
- `pushSubscription.endpoint` is globally unique, so the same browser endpoint owned by both the guest and the
  target can still collide on sign-in.
- `summarize-transactions.ts` and `get-calendar.ts` never receive the locale, so their filters keep the
  stored-name-only search the list no longer uses.
- `delete_category`'s description and `category_delete_hint` still say "movements" where bills now count too.
- The `tools/list` size was not re-measured (needs a run outside the sandbox).

## Next, in order

1. `pnpm check-types && pnpm test && pnpm build` outside the sandbox — the one gate this session could not close.
2. The adjustment compare-and-set, with the pattern `mark-transfer-received.ts` already uses.
3. Decide accent folding: schema column or drop the promise from `expense-search.md:40`.
4. Push once the credentials for `diegoquinfa` are in place (today `git push` answers 403).
5. Proposals 8, 10 and 12 are still open; 10 (federated contacts) is the gate for 8 and 12.


## Gotchas (do not rediscover)

- **A user's day is an instant.** `startOfDayIn` / `dayRangeIn` translate a calendar day with
  `user_settings.timezone`; a date-only import row is stored at that instant. The one hole is a zone whose
  spring-forward is at 00:00 (Havana, Santiago, Azores).
- **Duplicate evidence must be positive.** Same type, amount and user day, plus a title or a description both
  carry. Unknown rows are imported and flagged; a statement without titles re-imports its rows on purpose.
- **`move-guest-data` owns the table list** (20 tables) and its test scans `features/**/*.schema.ts` for `user_id`,
  skipping `auth/`. A table outside that glob escapes both silently.
- **The guest guard is "the guest still exists"**, never `isAnonymous`: a guest created before migration 0005 has
  no such column and would lose its ledger.
- **A D1 `db.batch` is atomic**: one FK failure rolls everything back and reaches `onError` as an opaque 500.
- **SQLite `LIKE` is ASCII-only.** Accents need normalization on both sides.
- **System categories store `name = NULL`** and are translated on read; never compare `category.name` for them.
- In DQFinance the sandbox blocks `pnpm` (store lock) and `node --test` (it spawns). `node <file>.test.ts` works.
- Never run two `db:generate` at once: the journal corrupts.
- `git push` is blocked (403). Deploys from `apps/web` with `-c ../../wrangler.jsonc`.

## How the user works

Converses in Spanish; wants repository artifacts in English. Uses `ponytail` (smallest change that fully solves
the task). Wants reviews from independent subagents, not self-review. Prefers corrections that do not rewrite
history. Expects ambiguity to be asked about, not guessed.
