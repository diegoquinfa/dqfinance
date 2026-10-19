import { m } from '#/shared/i18n'
import { Button } from '#/shared/ui/button'
import { DialogPanel } from '#/shared/ui/dialog-panel'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { NativeSelect } from '#/shared/ui/native-select'
import { toast } from 'sonner'
import { SubmitRow, productTypes } from './add-dialogs'
import { useUpdateCard, useUpdateProduct, type CardRow } from './accounts-api'
import type { CardBrand, CardColor } from './card-face'
import { CardDetailsFields } from './card-fields'
import { percentToBps } from './rates'

/** Renaming a product, changing its type, or setting the annual rate that feeds the yield estimate. */
export function EditProductDialog({
  id,
  name,
  type,
  annualRateBps,
}: {
  id: string
  name: string
  type: string
  annualRateBps: number | null
}) {
  const update = useUpdateProduct()
  return (
    <DialogPanel
      trigger={<Button variant="outline">{m.accounts_edit_product()}</Button>}
      title={`${m.accounts_edit_product()} · ${name}`}
    >
      {(close) => (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const rate = String(form.get('annualRate')).trim()
            update.mutate(
              {
                id,
                json: {
                  name: String(form.get('name')),
                  type: String(form.get('type')) as never,
                  annualRateBps: rate ? percentToBps(Number(rate)) : null,
                },
              },
              {
                onSuccess: () => {
                  close()
                  toast.success(m.toast_product_updated())
                },
              },
            )
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-product-name">{m.label_name()}</FieldLabel>
              <Input id="edit-product-name" name="name" defaultValue={name} required maxLength={80} autoFocus />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-product-type">{m.label_product_type()}</FieldLabel>
              <NativeSelect id="edit-product-type" name="type" defaultValue={type}>
                {productTypes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label()}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-product-rate">{m.product_annual_rate()}</FieldLabel>
              <Input
                id="edit-product-rate"
                name="annualRate"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                defaultValue={annualRateBps === null ? undefined : annualRateBps / 100}
              />
              <FieldDescription>{m.product_annual_rate_hint()}</FieldDescription>
            </Field>
            <SubmitRow close={close} pending={update.isPending} error={update.error?.message} label={m.action_save()} />
          </FieldGroup>
        </form>
      )}
    </DialogPanel>
  )
}

/** A card's brand, rate, color and credit details, editable from its source page. */
export function EditCardDialog({ card }: { card: CardRow }) {
  const update = useUpdateCard()
  const isCredit = card.kind === 'credit'
  return (
    <DialogPanel
      trigger={<Button variant="outline">{m.accounts_edit_card()}</Button>}
      title={`${m.accounts_edit_card()} · ${card.name}`}
    >
      {(close) => (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const last4 = String(form.get('last4'))
            const limit = String(form.get('limit'))
            const statementDay = String(form.get('statementDay'))
            const dueDay = String(form.get('dueDay'))
            const rate = String(form.get('interestRate')).trim()
            const brand = String(form.get('brand'))
            update.mutate(
              {
                id: card.id,
                json: {
                  name: String(form.get('name')),
                  last4: last4 || null,
                  brand: brand ? (brand as CardBrand) : null,
                  interestRateBps: isCredit && rate ? percentToBps(Number(rate)) : null,
                  interestRatePeriod:
                    isCredit && rate ? (String(form.get('interestRatePeriod')) as 'monthly' | 'annual') : null,
                  color: String(form.get('color')) as CardColor,
                  creditLimit: isCredit && limit ? Number(limit) : null,
                  statementDay: isCredit && statementDay ? Number(statementDay) : null,
                  dueDay: isCredit && dueDay ? Number(dueDay) : null,
                },
              },
              {
                onSuccess: () => {
                  close()
                  toast.success(m.toast_card_updated())
                },
              },
            )
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-card-name">{m.label_name()}</FieldLabel>
              <Input id="edit-card-name" name="name" defaultValue={card.name} required maxLength={80} autoFocus />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-card-last4">{`${m.label_last4()} (${m.label_optional()})`}</FieldLabel>
              <Input
                id="edit-card-last4"
                name="last4"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                defaultValue={card.last4 ?? undefined}
              />
            </Field>
            <CardDetailsFields idPrefix="edit-card" kind={card.kind} card={card} />
            <SubmitRow close={close} pending={update.isPending} error={update.error?.message} label={m.action_save()} />
          </FieldGroup>
        </form>
      )}
    </DialogPanel>
  )
}
