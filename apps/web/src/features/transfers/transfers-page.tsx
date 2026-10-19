import { m } from '#/shared/i18n'
import { formatDate } from '#/shared/dates'
import { formatMoney } from '#/shared/money'
import { Badge } from '#/shared/ui/badge'
import { Button } from '#/shared/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '#/shared/ui/empty'
import { PageHeader, rowsClass } from '#/shared/ui/page'
import { ListSkeleton } from '#/shared/ui/list-skeleton'
import { NewTransferDialog } from './new-transfer-dialog'
import { transferSideLabel } from './transfer-side'
import { useMarkTransferReceived, useTransfers, type Transfer } from './transfers-api'

const typeLabels: Record<Transfer['type'], () => string> = {
  own_same_bank: m.transfer_type_own_same_bank,
  own_other_bank: m.transfer_type_own_other_bank,
  withdrawal: m.transfer_type_withdrawal,
  deposit: m.transfer_type_deposit,
  cash_exchange: m.transfer_type_cash_exchange,
  card_payment: m.transfer_type_card_payment,
}

/** The type tag and the in-transit tag. Beside the headlines on a wide row, on the metadata line on a narrow one. */
function TransferBadges({ transfer }: { transfer: Transfer }) {
  return (
    <>
      <Badge variant="secondary">{typeLabels[transfer.type]()}</Badge>
      {!transfer.receivedAt && <Badge>{m.label_in_transit()}</Badge>}
    </>
  )
}

export function TransfersPage() {
  const transfers = useTransfers({ limit: 100 })
  const markReceived = useMarkTransferReceived()

  return (
    <>
      <PageHeader title={m.transfers_title()} actions={<NewTransferDialog trigger={<Button variant="outline">{m.transfers_new()}</Button>} />} />

      {transfers.isPending ? (
        <ListSkeleton rows={5} />
      ) : transfers.error ? (
        <p role="alert" className="text-sm text-destructive">
          {transfers.error.message}
        </p>
      ) : transfers.data.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{m.transfers_empty()}</EmptyTitle>
            <EmptyDescription>{m.transfers_empty_description()}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className={rowsClass}>
          {transfers.data.map((transfer) => {
            const from = transferSideLabel(transfer.from)
            const to = transferSideLabel(transfer.to)
            return (
              <li key={transfer.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-2 py-4">
                {/* Line 1: the bank on each side, the tags and the amount. */}
                <div className="flex min-w-0 basis-full flex-wrap items-baseline gap-x-3 gap-y-1 sm:basis-0 sm:flex-1">
                  <span className="break-words font-medium text-ink">{from.headline}</span>
                  <span aria-hidden className="text-faint">
                    →
                  </span>
                  <span className="sr-only">{` ${m.label_to()} `}</span>
                  <span className="break-words font-medium text-ink">{to.headline}</span>
                  <span className="hidden flex-wrap items-center gap-2 sm:flex">
                    <TransferBadges transfer={transfer} />
                  </span>
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-3">
                  <p className="text-right tabular-nums">
                    <span className="block font-medium text-ink">
                      {formatMoney(transfer.sentAmount, transfer.sentCurrency)}
                    </span>
                    {transfer.receivedCurrency !== transfer.sentCurrency && (
                      <span className="label-mono block text-muted-foreground">
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
                {/* Line 2: the account behind each side. */}
                {(from.detail || to.detail) && (
                  <p className="label-mono basis-full text-muted-foreground">
                    {from.detail}
                    {from.detail && to.detail && (
                      <>
                        <span aria-hidden className="mx-2 text-faint">
                          →
                        </span>
                        <span className="sr-only">{` ${m.label_to()} `}</span>
                      </>
                    )}
                    {to.detail}
                  </p>
                )}
                {/* Line 3: the date and the notes. */}
                <p className="label-mono basis-full text-muted-foreground">
                  <time dateTime={transfer.sentAt}>{formatDate(transfer.sentAt)}</time>
                  {transfer.fee !== null && ` / ${m.transfers_fee_note({ amount: formatMoney(transfer.fee, transfer.sentCurrency) })}`}
                  {transfer.fxDifference !== null &&
                    ` / ${m.transfers_fx_note({ amount: formatMoney(transfer.fxDifference, transfer.sentCurrency) })}`}
                  {transfer.note && ` / ${transfer.note}`}
                  <span className="sm:hidden"> / </span>
                  <span className="inline-flex flex-wrap items-center gap-2 align-middle sm:hidden">
                    <TransferBadges transfer={transfer} />
                  </span>
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
