import { formatDate } from '#/shared/dates'
import { m } from '#/shared/i18n'
import { formatMoney, formatSignedAmount } from '#/shared/money'
import { TransactionDetailDialog } from './transaction-detail-dialog'
import type { Transaction } from './transactions-api'

/**
 * One movement: what and when on the left, the amount on the right. Used by every movement list.
 * The bank (and the contact) sit muted beside the title, so the mono line stays short:
 * category, then the account. The whole row opens the movement to see, edit or delete it.
 */
export function TransactionRow({
  transaction,
  showDate = true,
  showSource = true,
  showCounterparty = true,
}: {
  transaction: Transaction
  /** Off in a list grouped by day, where the day heads the group. */
  showDate?: boolean
  showSource?: boolean
  /** Off on a contact's own page, where the name is already the title. */
  showCounterparty?: boolean
}) {
  const foreign = transaction.primaryAmount !== null && transaction.primaryCurrency !== null
  return (
    <li>
      <TransactionDetailDialog
        transaction={transaction}
        trigger={
          // Spans, not paragraphs: a button holds phrasing content only.
          <button
            type="button"
            className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 py-4 text-left"
          >
            <span className="truncate text-ink transition-transform duration-500 group-hover:translate-x-1">
              {transaction.title || transaction.category.name}
              {showCounterparty && transaction.counterparty && (
                <span className="ml-2 text-sm text-muted-foreground">{transaction.counterparty.name}</span>
              )}
              {showSource && transaction.source.bankName && (
                <span className="label-mono ml-2 text-muted-foreground">{transaction.source.bankName}</span>
              )}
            </span>
            <span
              className={
                transaction.type === 'income'
                  ? 'text-right font-medium text-income tabular-nums'
                  : 'text-right font-medium tabular-nums'
              }
            >
              <span className="sr-only">{transaction.type === 'income' ? m.label_income() : m.label_expense()}: </span>
              {foreign
                ? formatSignedAmount(transaction.type, transaction.primaryAmount!, transaction.primaryCurrency!)
                : formatSignedAmount(transaction.type, transaction.amount, transaction.currency)}
            </span>
            <span className="label-mono truncate text-muted-foreground">
              {showDate && (
                <>
                  <time dateTime={transaction.occurredAt}>{formatDate(transaction.occurredAt)}</time>
                  <span aria-hidden className="mx-2 text-faint">
                    /
                  </span>
                </>
              )}
              {transaction.category.name}
              {showSource && (
                <>
                  <span aria-hidden className="mx-2 text-faint">
                    /
                  </span>
                  {transaction.source.name}
                </>
              )}
            </span>
            {foreign && (
              <span className="label-mono text-right text-muted-foreground tabular-nums">
                {formatMoney(transaction.amount, transaction.currency)}
              </span>
            )}
          </button>
        }
      />
    </li>
  )
}
