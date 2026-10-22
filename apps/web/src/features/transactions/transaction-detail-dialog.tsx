import { Link } from '@tanstack/react-router'
import type * as React from 'react'
import { useState } from 'react'
import { formatDate } from '#/shared/dates'
import { m } from '#/shared/i18n'
import { formatMoney, formatSignedAmount } from '#/shared/money'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '#/shared/ui/alert-dialog'
import { Button } from '#/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '#/shared/ui/dialog'
import { FieldError } from '#/shared/ui/field'
import { Spinner } from '#/shared/ui/spinner'
import { toast } from 'sonner'
import { TransactionForm } from './new-transaction-dialog'
import { sourceLabel } from '#/shared/source-label'
import { useDeleteTransaction, type Transaction } from './transactions-api'

/**
 * One movement in full, opened from its row. Edit swaps the details for the prefilled form in the
 * same sheet; delete asks first. The fee and FX entries of a transfer only show their details.
 */
export function TransactionDetailDialog({ transaction, trigger }: { transaction: Transaction; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const title = transaction.title || transaction.category.name

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setEditing(false)
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? m.transactions_edit() : title}</DialogTitle>
          {!editing && <DialogDescription className="sr-only">{formatDate(transaction.occurredAt)}</DialogDescription>}
        </DialogHeader>
        {editing ? (
          <TransactionForm transaction={transaction} close={() => setOpen(false)} />
        ) : (
          <TransactionDetails transaction={transaction} onEdit={() => setEditing(true)} onDeleted={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function TransactionDetails({
  transaction,
  onEdit,
  onDeleted,
}: {
  transaction: Transaction
  onEdit: () => void
  onDeleted: () => void
}) {
  const details: [string, React.ReactNode][] = [
    [m.label_date(), <time dateTime={transaction.occurredAt}>{formatDate(transaction.occurredAt)}</time>],
    [m.label_source(), sourceLabel(transaction.source)],
    [m.label_category(), transaction.category.name],
  ]
  if (transaction.counterparty) {
    details.push([
      m.label_contact(),
      <Link to="/contacts/$id" params={{ id: transaction.counterparty.id }} className="link-draw">
        {transaction.counterparty.name}
      </Link>,
    ])
  }
  if (transaction.description) details.push([m.label_description(), transaction.description])
  const foreign = transaction.primaryAmount !== null && transaction.primaryCurrency !== null

  return (
    <div className="grid gap-6">
      {/* Like the row: a foreign charge leads with its value in the card's currency, the charge below. */}
      <p className="grid gap-1">
        <span
          className={
            transaction.type === 'income'
              ? 'type-title font-medium text-income tabular-nums'
              : 'type-title font-medium text-ink tabular-nums'
          }
        >
          <span className="sr-only">{transaction.type === 'income' ? m.label_income() : m.label_expense()}: </span>
          {foreign
            ? formatSignedAmount(transaction.type, transaction.primaryAmount!, transaction.primaryCurrency!)
            : formatSignedAmount(transaction.type, transaction.amount, transaction.currency)}
        </span>
        {foreign && (
          <span className="label-mono text-muted-foreground tabular-nums">
            {formatMoney(transaction.amount, transaction.currency)}
          </span>
        )}
      </p>
      <dl className="divide-y divide-line border-y border-line">
        {details.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-baseline gap-4 py-3">
            <dt className="label-mono text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {transaction.recurringExpenseId && <p className="text-sm text-muted-foreground">{m.transactions_from_recurring()}</p>}
      {transaction.transferId ? (
        <p className="text-sm text-muted-foreground">{m.transactions_from_transfer()}</p>
      ) : (
        <div className="flex justify-end gap-2">
          <DeleteTransactionButton transaction={transaction} onDeleted={onDeleted} />
          <Button onClick={onEdit}>{m.action_edit()}</Button>
        </div>
      )}
    </div>
  )
}

/** Movements are the record: deleting one is for a mistake, so it asks first. */
function DeleteTransactionButton({ transaction, onDeleted }: { transaction: Transaction; onDeleted: () => void }) {
  const remove = useDeleteTransaction()
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost">{m.action_delete()}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{m.transactions_delete_title()}</AlertDialogTitle>
          <AlertDialogDescription>{m.transactions_delete_hint()}</AlertDialogDescription>
        </AlertDialogHeader>
        <FieldError>{remove.error?.message}</FieldError>
        <AlertDialogFooter>
          <AlertDialogCancel>{m.action_cancel()}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={remove.isPending}
            onClick={(event) => {
              // Keep the dialog open while the request runs, and let its error show inside it.
              event.preventDefault()
              remove.mutate(transaction.id, {
                onSuccess: () => {
                  onDeleted()
                  toast.success(m.toast_transaction_deleted())
                },
              })
            }}
          >
            {remove.isPending && <Spinner data-icon="inline-start" />}
            {m.action_delete()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
