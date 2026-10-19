import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { m } from '#/shared/i18n'
import { Button } from '#/shared/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '#/shared/ui/empty'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { Label } from '#/shared/ui/label'
import { ListSkeleton } from '#/shared/ui/list-skeleton'
import { Spinner } from '#/shared/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '#/shared/ui/toggle-group'
import { useCreateTransfer } from '../transfers/transfers-api'
import { listProducts, useAccounts, useCreateProduct } from './accounts-api'
import { percentToBps } from './rates'

const FORM_ID = 'new-pocket-form'

/**
 * A pocket as a page: the money set aside inside an account, with its own rate (design D14).
 * The amount is recorded as a transfer from the parent, never as an adjustment.
 */
export function NewPocketPage({ productId }: { productId?: string }) {
  const accounts = useAccounts()
  const create = useCreateProduct()
  const transfer = useCreateTransfer()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [rate, setRate] = useState('')
  const [payout, setPayout] = useState<'daily' | 'monthly'>('monthly')
  // The pocket a previous attempt created, so a retry does not create it twice.
  const [created, setCreated] = useState<string | null>(null)

  if (accounts.isPending) return <ListSkeleton rows={4} />
  if (accounts.error) {
    return (
      <p role="alert" className="py-10 text-sm text-destructive">
        {accounts.error.message}
      </p>
    )
  }

  // A pocket lives inside a product, and a pocket cannot hold another pocket.
  const parent = listProducts(accounts.data).find((product) => product.id === productId)
  const valid = parent && parent.type !== 'pocket' ? parent : undefined
  const pending = create.isPending || transfer.isPending

  const backLink = (
    <nav aria-label={m.nav_accounts()}>
      <Link to="/accounts" className="label-mono group inline-flex gap-2 text-muted-foreground hover:text-ink">
        <span aria-hidden className="transition-transform duration-500 group-hover:-translate-x-1">
          ←
        </span>
        {m.nav_accounts()}
      </Link>
    </nav>
  )

  async function submit(form: FormData) {
    if (!valid) return
    setError(null)
    const saved: string[] = created ? [m.toast_pocket_created()] : []
    // What this attempt saved, so a retry only toasts what it really saved.
    let pocketAdded = false
    let transferAdded = false
    try {
      let pocketId = created
      if (!pocketId) {
        const pocket = await create.mutateAsync({
          bankAccountId: valid.bankAccountId,
          type: 'pocket',
          parentProductId: valid.id,
          name: String(form.get('name')).trim(),
          currency: valid.currency,
          annualRateBps: rate ? percentToBps(Number(rate)) : undefined,
          yieldPayout: rate ? payout : undefined,
        })
        pocketId = pocket.id
        setCreated(pocket.id)
        saved.push(m.toast_pocket_created())
        pocketAdded = true
      }
      const amount = Number(form.get('amount') ?? 0)
      if (amount > 0) {
        await transfer.mutateAsync({
          from: { type: 'product', id: valid.id },
          to: { type: 'product', id: pocketId },
          amount,
        })
        saved.push(m.toast_transfer_created())
        transferAdded = true
      }
      if (pocketAdded) toast.success(m.toast_pocket_created())
      if (transferAdded) toast.success(m.toast_transfer_created())
      void navigate({ to: '/accounts/$type/$id', params: { type: 'product', id: pocketId } })
    } catch (failure) {
      // Say what was saved, and keep it so a retry does not create it twice.
      const message = failure instanceof Error ? failure.message : m.error_generic()
      setError(saved.length ? m.accounts_new_partial({ created: saved.join(' '), error: message }) : message)
    }
  }

  if (!valid) {
    return (
      <>
        <header className="grid gap-4 pt-6 pb-8 md:pt-10 md:pb-12">
          {backLink}
          <h1 className="type-title font-medium text-ink">{m.accounts_new_pocket_title()}</h1>
        </header>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{m.accounts_empty()}</EmptyTitle>
            <EmptyDescription>{m.accounts_new_pocket_no_parent()}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" asChild>
              <Link to="/accounts">{m.nav_accounts()}</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </>
    )
  }

  return (
    <>
      <header className="grid gap-6 pt-6 pb-8 md:pt-10 md:pb-12 lg:grid-cols-12 lg:items-end lg:gap-x-12">
        <div className="grid gap-4 lg:col-span-8">
          {backLink}
          <h1 className="type-title font-medium text-ink">{m.accounts_new_pocket_title()}</h1>
          {/* The pocket lives inside this account, so it is shown read-only. */}
          <p className="text-sm text-muted-foreground">
            {m.label_account()}: {valid.name}
            {valid.last4 && <span className="label-mono ml-2 text-muted-foreground">•••• {valid.last4}</span>}
          </p>
        </div>
        {/* Reachable at the top on mobile; the form repeats it at the end. */}
        <div className="lg:col-span-4 lg:justify-self-end">
          <Button type="submit" form={FORM_ID} className="w-full lg:w-auto" disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />}
            {m.action_create()}
          </Button>
        </div>
      </header>

      {/* onSubmit, not action: React clears an action form after it runs, losing a failed create's fields. */}
      <form
        id={FORM_ID}
        className="grid max-w-2xl gap-6"
        onSubmit={(event) => {
          event.preventDefault()
          void submit(new FormData(event.currentTarget))
        }}
      >
        {/* The amount comes first and large: the money set aside is the number that matters. */}
        <div className="grid gap-2 border-b border-line pb-3 transition-colors has-focus-visible:border-signal">
          <Label htmlFor="new-pocket-amount">{m.accounts_new_pocket_amount()}</Label>
          <div className="flex items-center gap-3">
            <input
              id="new-pocket-amount"
              name="amount"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0"
              className="type-title w-full min-w-0 [appearance:textfield] bg-transparent font-medium text-ink tabular-nums placeholder:text-muted-foreground focus-visible:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="label-mono text-muted-foreground">{valid.currency}</span>
          </div>
          <FieldDescription>{m.accounts_new_pocket_amount_hint()}</FieldDescription>
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="new-pocket-name">{m.label_name()}</FieldLabel>
            <Input id="new-pocket-name" name="name" required maxLength={80} autoFocus />
          </Field>

          <Field>
            <FieldLabel htmlFor="new-pocket-rate">{m.product_annual_rate()}</FieldLabel>
            <Input
              id="new-pocket-rate"
              name="annualRate"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
            />
            {/* The payout only matters once there is a rate. */}
            {rate && (
              <div className="flex items-center gap-3">
                <span className="label-mono text-muted-foreground">{m.yield_payout_label()}</span>
                <ToggleGroup
                  type="single"
                  aria-label={m.yield_payout_label()}
                  value={payout}
                  onValueChange={(value) => setPayout(value as 'daily' | 'monthly')}
                >
                  <ToggleGroupItem value="daily">{m.yield_payout_daily()}</ToggleGroupItem>
                  <ToggleGroupItem value="monthly">{m.yield_payout_monthly()}</ToggleGroupItem>
                </ToggleGroup>
              </div>
            )}
          </Field>
        </FieldGroup>

        <FieldError>{error}</FieldError>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" asChild>
            <Link to="/accounts">{m.action_cancel()}</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />}
            {m.action_create()}
          </Button>
        </div>
      </form>
    </>
  )
}
