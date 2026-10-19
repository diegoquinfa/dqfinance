import { Link } from '@tanstack/react-router'
import { useRecurringExpenses, useSkipRecurring, useConfirmRecurring } from '#/features/recurring-expenses/recurring-expenses-api'
import { useTransactions } from '#/features/transactions/transactions-api'
import { formatDate, formatDay } from '#/shared/dates'
import { m } from '#/shared/i18n'
import { formatMoney, formatSignedAmount } from '#/shared/money'
import { Badge } from '#/shared/ui/badge'
import { Button } from '#/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/shared/ui/card'
import { EmptyState, Field, ListSkeleton } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { useBalances } from './balances-api'

export function OverviewPage() {
  const balances = useBalances()
  const pending = useRecurringExpenses(true)
  const recent = useTransactions({ limit: 10 })
  const confirm = useConfirmRecurring()
  const skip = useSkipRecurring()

  if (balances.isPending) return <ListSkeleton rows={6} />
  if (balances.error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {balances.error.message}
      </p>
    )
  }

  const { accounts, creditCards, inTransit } = balances.data

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{m.overview_title()}</h1>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-lg">{m.overview_accounts()}</CardTitle>
          <Link to="/accounts" className="text-sm text-primary hover:underline">
            {m.nav_accounts()}
          </Link>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <EmptyState title={m.accounts_empty()} description={m.overview_no_accounts()} />
          ) : (
            <ul className="divide-y">
              {accounts.map((account) => (
                <li key={`${account.ref.type}:${account.ref.id}`} className="flex items-baseline justify-between gap-4 py-2">
                  <span>
                    {account.name}
                    {account.bankName && <span className="ml-2 text-sm text-muted-foreground">{account.bankName}</span>}
                  </span>
                  <span className="tabular-nums">{formatMoney(account.balance, account.currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{m.overview_cards()}</CardTitle>
        </CardHeader>
        <CardContent>
          {creditCards.length === 0 ? (
            <p className="text-sm text-muted-foreground">{m.overview_no_cards()}</p>
          ) : (
            <ul className="divide-y">
              {creditCards.map((card) => (
                <li key={card.ref.id} className="grid gap-1 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{card.name}</span>
                    <span className="tabular-nums">
                      {m.accounts_card_total({ amount: formatMoney(card.total, card.currency) })}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    {card.debts.map((debt) => (
                      <span key={debt.currency} className="tabular-nums">
                        {m.accounts_card_debt_currency({
                          amount: formatMoney(debt.amount, debt.currency),
                          currency: debt.currency,
                        })}
                      </span>
                    ))}
                    {card.available !== null && (
                      <span className="tabular-nums">
                        {m.accounts_card_available({ amount: formatMoney(card.available, card.currency) })}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {inTransit.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{m.overview_in_transit()}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2">
              {inTransit.map((transfer) => (
                <li key={transfer.currency} className="flex justify-between">
                  <span>{transfer.currency}</span>
                  <span className="tabular-nums">{formatMoney(transfer.amount, transfer.currency)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-lg">{m.overview_pending()}</CardTitle>
          <Link to="/recurring" className="text-sm text-primary hover:underline">
            {m.nav_recurring()}
          </Link>
        </CardHeader>
        <CardContent>
          {pending.isPending ? (
            <ListSkeleton rows={2} />
          ) : (pending.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{m.overview_pending_empty()}</p>
          ) : (
            <ul className="grid gap-3">
              {(pending.data ?? []).map((item) => (
                <li key={item.id} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div>
                    <p className="font-medium">
                      {item.name} · <span className="tabular-nums">{formatMoney(item.amount, item.currency)}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">{formatDay(item.nextDueOn)}</p>
                  </div>
                  <div className="flex items-end gap-2">
                    <Field id={`pending-amount-${item.id}`} label={m.label_amount()}>
                      <Input
                        id={`pending-amount-${item.id}`}
                        type="number"
                        step="0.01"
                        min="0.01"
                        inputMode="decimal"
                        defaultValue={item.amount}
                        className="tabular-nums"
                      />
                    </Field>
                    <Button
                      disabled={confirm.isPending}
                      onClick={() => {
                        const input = document.getElementById(`pending-amount-${item.id}`) as HTMLInputElement | null
                        confirm.mutate({ id: item.id, amount: input ? Number(input.value) : item.amount })
                      }}
                    >
                      {m.action_confirm()}
                    </Button>
                    <Button variant="outline" disabled={skip.isPending} onClick={() => skip.mutate(item.id)}>
                      {m.action_skip()}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-lg">{m.overview_recent()}</CardTitle>
          <Link to="/transactions" className="text-sm text-primary hover:underline">
            {m.nav_transactions()}
          </Link>
        </CardHeader>
        <CardContent>
          {recent.isPending ? (
            <ListSkeleton rows={4} />
          ) : (recent.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{m.transactions_empty()}</p>
          ) : (
            <ul className="divide-y">
              {(recent.data ?? []).map((transaction) => (
                <li key={transaction.id} className="flex items-baseline justify-between gap-4 py-2">
                  <div className="min-w-0">
                    <p className="truncate">
                      {transaction.description || transaction.category.name}
                      {transaction.counterparty && (
                        <span className="ml-2 text-sm text-muted-foreground">{transaction.counterparty.name}</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <time dateTime={transaction.occurredAt}>{formatDate(transaction.occurredAt)}</time>
                      {' · '}
                      {transaction.source.name}
                    </p>
                  </div>
                  <p className="flex items-baseline gap-2">
                    {transaction.primaryAmount !== null && transaction.primaryCurrency !== null && (
                      <Badge variant="secondary" className="font-normal tabular-nums">
                        {formatMoney(transaction.amount, transaction.currency)}
                      </Badge>
                    )}
                    <span
                      className={
                        transaction.type === 'income' ? 'font-medium text-income tabular-nums' : 'font-medium tabular-nums'
                      }
                    >
                      {transaction.primaryAmount !== null && transaction.primaryCurrency !== null
                        ? formatSignedAmount(transaction.type, transaction.primaryAmount, transaction.primaryCurrency)
                        : formatSignedAmount(transaction.type, transaction.amount, transaction.currency)}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
