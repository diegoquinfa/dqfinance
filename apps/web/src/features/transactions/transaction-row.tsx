import { formatDate } from '#/shared/dates'
import { m } from '#/shared/i18n'
import { formatMoney, formatSignedAmount } from '#/shared/money'
import type { Transaction } from './transactions-api'

/** One movement: what and when on the left, the amount on the right. Used by every movement list. */
export function TransactionRow({ transaction, showSource = true }: { transaction: Transaction; showSource?: boolean }) {
  const foreign = transaction.primaryAmount !== null && transaction.primaryCurrency !== null
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 py-4">
      <p className="truncate text-ink">
        {transaction.description || transaction.category.name}
        {transaction.counterparty && <span className="ml-2 text-sm text-muted-foreground">{transaction.counterparty.name}</span>}
      </p>
      <p
        className={
          transaction.type === 'income' ? 'text-right font-medium text-income tabular-nums' : 'text-right font-medium tabular-nums'
        }
      >
        <span className="sr-only">{transaction.type === 'income' ? m.label_income() : m.label_expense()}: </span>
        {foreign
          ? formatSignedAmount(transaction.type, transaction.primaryAmount!, transaction.primaryCurrency!)
          : formatSignedAmount(transaction.type, transaction.amount, transaction.currency)}
      </p>
      <p className="label-mono truncate text-muted-foreground">
        <time dateTime={transaction.occurredAt}>{formatDate(transaction.occurredAt)}</time>
        {showSource && (
          <>
            <span aria-hidden className="mx-2 text-faint">
              /
            </span>
            {transaction.source.name}
          </>
        )}
        <span aria-hidden className="mx-2 text-faint">
          /
        </span>
        {transaction.category.name}
      </p>
      {foreign && (
        <p className="label-mono text-right text-muted-foreground tabular-nums">
          {formatMoney(transaction.amount, transaction.currency)}
        </p>
      )}
    </li>
  )
}
