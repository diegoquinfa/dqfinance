# Feature proposals

Ideas to evaluate, not committed work. Related user feedback is in
[2026-10-20-user-feedback.md](2026-10-20-user-feedback.md); the current domain is described in
[2026-10-18-finance-domain-design.md](2026-10-18-finance-domain-design.md).

## 1. Safe to spend today

One daily number: how much the user can spend **today**.

```
today = (available money − pending fixed bills − savings and set-asides) / days left
```

"Days left" runs to the end of the month or to the next expected income (proposal 7), so the number corrects
itself: overspend one day and the next day's figure drops; underspend and it rises.

The user also sets a **monthly spending target** that acts as a cap: if the formula gives more than what is left
of that target divided by the days left, the lower value wins.

## 2. Forecast

Kept separate from proposal 1. It answers "where am I heading if nothing changes": how much the user would have
left at month end if they keep their average spending, counting the fixed bills still due and the expected
income.

Shown as a chart up to month end, with a warning when the projected balance approaches zero.

## 3. Upcoming expense reminders

Notify the user **before** a recurring charge hits ("Netflix is charged tomorrow"), with a lead time the user
chooses.

Reminders arrive by push notification or by a webhook the user configures in their settings panel. The panel
has a button to send a test reminder and see whether it arrived.

## 4. Annual bills spread monthly

Annual expenses (insurance, property tax, vehicle inspection) should not arrive as a surprise. An annual
expense sets aside one twelfth of its amount each month, so the money is there when the bill comes.

## 5. Spread unexpected expenses

When something large and unexpected happens (the washing machine breaks), the user can spread that expense over
N months for budgeting, so the current month does not drop to zero. The real transaction keeps its date and
amount; only the budget and safe-to-spend views see it in installments.

## 6. Savings goals

A goal with an amount and a date ("trip, 3,000,000 by June"), contributions toward it, and its progress.

## 7. Irregular income

Not everyone has one fixed monthly salary: freelancers, weekly pay, several small incomes. The user can have
several incomes, each with its own frequency (weekly, biweekly, monthly, irregular) or estimated from history,
and safe to spend and the forecast use them instead of assuming a single payday.

## 8. Shared expenses

A split calculator for an expense among several people (equal parts, by amount, or by percentage) and a record
of who owes whom.

With a contact who doesn't use dqfinance, the split only lives in the user's own records. With a connected
contact (proposal 10), their share arrives as a request to accept or reject.

## 9. Custom categories

Today categories can only be created. Add edit, delete, or merge (moving their transactions), with an icon and
a color, and maybe subcategories.

## 10. Federated contacts

Each user has a `user@instance` handle and connects with other users on the same instance or on another one.

- **Connecting:** a contact request needs the other person's acceptance. Either side can remove or block the
  contact later.
- **Requests, never surprises:** if someone sends the user money or assigns them part of an expense, the user
  gets a request to accept or reject it. Nothing enters their records without their approval.

## 11. Expense search

Find movements by what they were, from the web or from an agent.

- **Two ways to search:** exact keywords, or natural language ("expenses at Web Sunday").
- **What is searched:** title, description, and category only, never amounts.
- **Compact for agents:** one line per result, so an agent can scan many results and ask for details only when
  it needs them.

## 12. Group projects

A shared budget toward one goal and date, for example a trip to Canada.

- **Shared budget:** a goal amount and a date, each member's contributions and expenses, and who owes whom.
- **Custodian (optional):** one member holds the pooled money.
- **Individual goals (optional):** instead of pooling, each member keeps an individual goal toward the shared
  plan, and the group sees everyone's progress.

Open question: what happens if someone leaves a project with a pending balance.

## 13. Budgets

The user creates budgets per category ("food, 800,000 a month") or custom ones that combine several categories
or have their own period ("weekend outings", "December").

- Each budget shows how much has been spent and how much is left.
- Notifications when approaching the limit (for example at 80%) and when going over, with thresholds the user
  can adjust.
