import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { m } from '#/shared/i18n'
import { Button } from '#/shared/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '#/shared/ui/empty'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { ListSkeleton } from '#/shared/ui/list-skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/shared/ui/select'
import { Spinner } from '#/shared/ui/spinner'
import { useAccounts, useCreateCard, type CardInput } from './accounts-api'
import { cardKinds } from './add-dialogs'
import { CardFace, type CardBrand, type CardColor } from './card-face'
import { CardDetailsFields } from './card-fields'
import { percentToBps } from './rates'

const FORM_ID = 'new-card-form'

/**
 * #7: a card as a page, with the face it will have in the wallet drawn above the fields as they are
 * typed. A card always belongs to a product, so the product is picked here instead of the dialog's.
 */
export function NewCardPage({ productId }: { productId?: string }) {
  const accounts = useAccounts()
  const create = useCreateCard()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [kind, setKind] = useState<CardInput['kind']>('debit')
  const [name, setName] = useState('')
  const [last4, setLast4] = useState('')
  const [face, setFace] = useState<{ brand: CardBrand | null; color: CardColor }>({ brand: null, color: 'ink' })
  // null means untouched: the first product wins, so landing before the tree loads is safe.
  const [product, setProduct] = useState<string | null>(productId ?? null)

  if (accounts.isPending) return <ListSkeleton rows={4} />
  if (accounts.error) {
    return (
      <p role="alert" className="py-10 text-sm text-destructive">
        {accounts.error.message}
      </p>
    )
  }

  const products = accounts.data.banks.flatMap((bank) =>
    bank.accounts.flatMap((account) =>
      account.products.map((item) => ({
        id: item.id,
        label: `${bank.name} · ${account.name} · ${item.name}`,
      })),
    ),
  )
  const productValue = product ?? products[0]?.id ?? ''
  const isCredit = kind === 'credit'
  const pending = create.isPending

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

  if (products.length === 0) {
    return (
      <>
        <header className="grid gap-4 pt-6 pb-8 md:pt-10 md:pb-12">
          {backLink}
          <h1 className="type-title font-medium text-ink">{m.accounts_new_card_title()}</h1>
        </header>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{m.accounts_empty()}</EmptyTitle>
            <EmptyDescription>{m.accounts_new_card_no_products()}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" asChild>
              <Link to="/accounts/new">{m.accounts_add_bank()}</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </>
    )
  }

  async function submit(form: FormData) {
    setError(null)
    const rate = String(form.get('interestRate')).trim()
    const brand = String(form.get('brand'))
    const limit = String(form.get('limit')).trim()
    const statementDay = String(form.get('statementDay')).trim()
    const dueDay = String(form.get('dueDay')).trim()
    const cardLast4 = String(form.get('last4')).trim()
    try {
      const card = await create.mutateAsync({
        productId: productValue,
        kind,
        name: String(form.get('name')),
        last4: cardLast4 || undefined,
        creditLimit: isCredit && limit ? Number(limit) : undefined,
        statementDay: isCredit && statementDay ? Number(statementDay) : undefined,
        dueDay: isCredit && dueDay ? Number(dueDay) : undefined,
        brand: brand ? (brand as CardBrand) : undefined,
        interestRateBps: isCredit && rate ? percentToBps(Number(rate)) : undefined,
        interestRatePeriod: isCredit && rate ? (String(form.get('interestRatePeriod')) as 'monthly' | 'annual') : undefined,
        color: String(form.get('color')) as CardColor,
      })
      toast.success(m.toast_card_created())
      // A credit card has its own page (debt and available credit); a debit card belongs to its product.
      void navigate(
        isCredit
          ? { to: '/accounts/$type/$id', params: { type: 'card', id: card.id } }
          : { to: '/accounts/$type/$id', params: { type: 'product', id: productValue } },
      )
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : m.error_generic())
    }
  }

  return (
    <>
      <header className="grid gap-6 pt-6 pb-8 md:pt-10 md:pb-12 lg:grid-cols-12 lg:items-end lg:gap-x-12">
        <div className="grid gap-4 lg:col-span-8">
          {backLink}
          <h1 className="type-title font-medium text-ink">{m.accounts_new_card_title()}</h1>
        </div>
        <div className="lg:col-span-4 lg:justify-self-end">
          <Button type="submit" form={FORM_ID} className="w-full lg:w-auto" disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />}
            {m.action_create()}
          </Button>
        </div>
      </header>

      <CardFace
        className="mb-10"
        name={name || m.label_card()}
        last4={last4.length === 4 ? last4 : null}
        brand={face.brand}
        color={face.color}
      />

      {/* onSubmit, not action: React clears an action form after it runs, losing a failed create's fields. */}
      <form
        id={FORM_ID}
        className="grid max-w-2xl gap-6"
        onSubmit={(event) => {
          event.preventDefault()
          void submit(new FormData(event.currentTarget))
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="new-card-kind">{m.label_kind()}</FieldLabel>
            <Select value={kind} onValueChange={(value) => setKind(value as CardInput['kind'])}>
              <SelectTrigger id="new-card-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cardKinds.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="new-card-product">{m.accounts_new_product_label()}</FieldLabel>
            <Select value={productValue} onValueChange={setProduct}>
              <SelectTrigger id="new-card-product">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {products.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>{m.accounts_new_card_product_hint()}</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="new-card-name">{m.label_name()}</FieldLabel>
            <Input
              id="new-card-name"
              name="name"
              required
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="new-card-last4">{`${m.label_last4()} (${m.label_optional()})`}</FieldLabel>
            <Input
              id="new-card-last4"
              name="last4"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={last4}
              onChange={(event) => setLast4(event.target.value)}
            />
          </Field>

          <CardDetailsFields idPrefix="new-card" kind={kind} onPreview={setFace} />
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
