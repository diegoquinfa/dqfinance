# Session handoff — 2026-10-23: the fix batch for the feature review

Read first: [AGENTS.md](../../AGENTS.md), the [proposals handoff](./2026-10-22-proposals-handoff.md) and the
[feature review](./2026-10-23-feature-review-handoff.md), whose findings this batch fixes.

## State

- Branch `claude/charming-cerf-g5kjgf`, pushed, 33 commits over `fix/reviewer-findings` (`75007f3`), which it
  contains unchanged; nothing was rewritten. No PR is open.
- Gate from the root: `pnpm check-types && pnpm test && pnpm build` passes. API 343 tests, web 37, scripts 5
  (before the batch: 280, 29, 5).
- Not verified: a browser run, a real D1, the CI workflow on GitHub, and `pnpm dev`.

## How it was done

One orchestrator and parallel Haiku agents, each in its own worktree under `.worktrees/`, each commit reviewed and
cherry-picked onto this branch, then an independent read-only review of the whole diff. Some agent commits carry
a `Co-Authored-By: Claude Haiku 5.5` trailer: that is the model that wrote them.

## What changed

| Area | Commits | What |
| --- | --- | --- |
| Build | `ce70f8e` | i18n compiles from the plugins in `node_modules`; the build fails when the catalog is empty (it used to ship an empty one with exit 0 when jsdelivr was unreachable) |
| Safe to spend | `e8bc338`, `66a0b62` | Saved money is held back in full: a goal holds what it has plus what this month's share (the one the month started with) still lacks, capped at the target; a yearly bill holds the twelfths its cycle has earned |
| Overdue bills | `f694504`, `71094bf`, `b2333e7` | One rule (`spending/bill-occurrences.ts`): an overdue bill is owed once, today. Safe to spend, the forecast and the calendar agree; a past calendar range keeps the dates |
| Small fixes | `64ac033`, `b186a1a`, `ec1c836`, `ba97451` | `adjust_balance` refuses a currency the user never enabled; "Date to" includes the picked day; the agent's search line uses the user's day and flattens `\r`, `\n`, `|`; the over-spend line says whether the money or the target is over |
| Test harness | `21b1364` and the `test(...)` commits | The D1 shim runs a batch in one transaction, `raw()` returns arrays, `run()` returns D1's `{ meta: { changes } }`. DB tests for merge/delete of categories, goals, adjustments, safe to spend (two users), forecast, reminders, the hook cap. DB tests pin the clock |
| Cron | `4452192`, `00fe2bc` | Daily `scheduled` handler (13:17 UTC): deletes abandoned guests (older than 7 days with no live session), one statement per table for all of them; then checks reminders for users with a hook |
| CI | `474f2bd` | `.github/workflows/ci.yml`: Node 24, the root gate, and a guard against focused tests |
| Webhooks | `d9a4011` … `59ad339`, `aaa0188` | Guests refused (API and UI); at most 10 hooks, secrets of 16+ characters; overdue bills announced; header `X-DQFinance-Signature: t=<unix>,v1=<hex>` over `t.body`; a toast when a hook missed a reminder; lead days saved only as a whole number |
| Timezone | `e99f31d`, `f4aeec3` | The timezone is editable in settings; the web reads and writes days in it (`shared/zoned-day.ts`), falling back to the device before settings load |
| Categories | `7ddd33b` | A category with movements is refused with 409, like one in use |

## The review of the batch

An independent reviewer read the whole diff and probed it. Two findings were bugs and are fixed (`66a0b62`,
`b2333e7`). It checked as correct: the cron's set-based delete (it touches only anonymous users past retention
with no live session, inside one transaction), the webhook signature and delivery id, the yearly twelfths, i18n
parity, and the new tests (mutation checks show they fail when the rule is broken).

The handoff's claim that the shim never enabled foreign keys was wrong: `node:sqlite` enables them by default.

## Still open, with the reason

- **The webhook header format changed** (`sha256=<hex>` → `t=…,v1=…`). Webhooks exist only on this branch, not on
  `main`, so no receiver should depend on the old format. If one does, it must switch.
- **A goal's saved money stays held until the goal is deleted or reached and spent.** Contributions are bookkeeping,
  not movements, so nothing releases them when the purchase is recorded. Product call: release on completion, or
  record contributions as transfers.
- **Changing the timezone re-reads every stored instant**, so a movement entered at noon in Bogotá can read as the
  next day in Tokyo. Correct for an instant; a hint in settings could warn.
- **Budgets count only movements in their own currency** (no FX by design). A budget in a second currency shows 0
  spent against movements in the primary one. UX call: limit budgets to the primary currency, or label them.
- **The forecast does not project average spending**, only bills and expected income (proposal 2 asks for the
  average). Product call: which window is "average".
- **Guest documents stay in R2** after the cron deletes the guest's rows.
- **The reminder loop has no budget**: one invocation checks every user in turn; at scale it can exhaust
  subrequests and leave the rest for the next day.
- **The hook cap is count-then-insert** (a `shortcut:` comment); two racing creates can exceed it by one.
- **The lead-days field still saves on each valid keystroke**, without ordering the responses.
- The decided items of the previous handoffs still hold (income dated today, search without an index, the
  adjustment guard window, the URL guard by name).

## Gotchas (do not rediscover)

- **`isolation: worktree` agents may start from `main`**, not from the current branch: four of six did. Create the
  worktrees yourself (`git worktree add -b <name> .worktrees/<name> <commit>`) and point each agent at its path.
- **jsdelivr is blocked in the cloud sandbox.** The i18n build no longer needs it.
- **`.githooks/pre-commit` is not executable in the repository** (mode 100644), so on Linux git skips it with a
  hint. `git add --chmod=+x .githooks/pre-commit` fixes it for everyone; then the next commit that touches
  `docs/plans/2026-10-18-finance-domain-design.md` is refused, because that file is already over 20,000 bytes.
  Split it first.
- **Cron limits:** a D1 invocation on the free plan allows 50 queries. Any per-user loop in `scheduled` must stay
  set-based or bounded.
- `node --test scripts/` needs Node 24; the root script now uses a glob that works on 22 as well.

## Next, in order

1. Open the PR from this branch (to `fix/reviewer-findings` or straight to `main` with it) and let CI run once.
2. Make the pre-commit hook executable and split the domain design document.
3. Take the product calls above: goal release, budget currency, forecast average.
