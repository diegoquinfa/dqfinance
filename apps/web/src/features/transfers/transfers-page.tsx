import { m } from '#/shared/i18n'
import { formatDate } from '#/shared/dates'
import { formatMoney } from '#/shared/money'
import { Badge } from '#/shared/ui/badge'
import { Button } from '#/shared/ui/button'
import { EmptyState, ListSkeleton } from '#/shared/ui/field'
import { NewTransferDialog } from './new-transfer-dialog'
import { useMarkTransferReceived, useTransfers, type Transfer } from './transfers-api'

const typeLabels: Record<Transfer['type'], () => string> = {
  own_same_bank: m.transfer_type_own_same_bank,
  own_other_bank: m.transfer_type_own_other_bank,
  withdrawal: m.transfer_type_withdrawal,
  deposit: m.transfer_type_deposit,
  cash_exchange: m.transfer_type_cash_exchange,
  card_payment: m.transfer_type_card_payment,
}

export function TransfersPage() {
  const transfers = useTransfers({ limit: 100 })
  const markReceived = useMarkTransferReceived()

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{m.transfers_title()}</h1>
        <NewTransferDialog trigger={<Button>{m.transfers_new()}</Button>} />
      </div>

      {transfers.isPending ? (
        <ListSkeleton rows={5} />
      ) : transfers.error ? (
        <p role="alert" className="text-sm text-destructive">
          {transfers.error.message}
        </p>
      ) : transfers.data.length === 0 ? (
        <EmptyState title={m.transfers_empty()} description={m.transfers_empty_description()} />
      ) : (
        <ul className="divide-y">
          {transfers.data.map((transfer) => (
            <li key={transfer.id} className="flex flex-wrap items-baseline justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {transfer.from.name} → {transfer.to.name}
                  </span>
                  <Badge variant="secondary" className="font-normal">
                    {typeLabels[transfer.type]()}
                  </Badge>
                  {!transfer.receivedAt && <Badge className="font-normal">{m.label_in_transit()}</Badge>}
                </p>
                <p className="text-sm text-muted-foreground">
                  <time dateTime={transfer.sentAt}>{formatDate(transfer.sentAt)}</time>
                  {transfer.fee !== null && ` · ${m.transfers_fee_note({ amount: formatMoney(transfer.fee, transfer.sentCurrency) })}`}
                  {transfer.fxDifference !== null &&
                    ` · ${m.transfers_fx_note({ amount: formatMoney(transfer.fxDifference, transfer.sentCurrency) })}`}
                  {transfer.note && ` · ${transfer.note}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-right tabular-nums">
                  <span className="block font-medium">
                    {formatMoney(transfer.sentAmount, transfer.sentCurrency)}
                  </span>
                  {transfer.receivedCurrency !== transfer.sentCurrency && (
                    <span className="block text-sm text-muted-foreground">
                      {formatMoney(transfer.receivedAmount, transfer.receivedCurrency)}
                    </span>
                  )}
                </p>
                {!transfer.receivedAt && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={markReceived.isPending}
                    onClick={() => markReceived.mutate(transfer.id)}
                  >
                    {m.transfers_mark_received()}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
