import { useState } from 'react'
import { m } from '#/shared/i18n'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { NativeSelect } from '#/shared/ui/native-select'
import { ToggleGroup, ToggleGroupItem } from '#/shared/ui/toggle-group'
import { CARD_FACE_COLORS, brandLabel, cardBrands, cardColors, colorLabel, type CardBrand, type CardColor } from './card-face'

type Period = 'monthly' | 'annual'

export type CardDetails = {
  brand: CardBrand | null
  interestRateBps: number | null
  interestRatePeriod: Period | null
  color: CardColor | null
  creditLimit: number | null
  statementDay: number | null
  dueDay: number | null
}

const empty: CardDetails = {
  brand: null,
  interestRateBps: null,
  interestRatePeriod: null,
  color: null,
  creditLimit: null,
  statementDay: null,
  dueDay: null,
}

/**
 * Everything about a card beyond its kind, name and last 4: the fields #3 added (brand, the rate the
 * issuer charges with its MV / EA period, the face color) plus what a credit card carries. The
 * create and the edit dialog render the same set, so the chosen period and color travel as hidden
 * inputs and both read one FormData.
 */
export function CardDetailsFields({
  idPrefix,
  kind,
  card = empty,
  onPreview,
}: {
  idPrefix: string
  kind: 'debit' | 'credit'
  card?: CardDetails
  /** The page around it draws a live card face, so the brand and color it holds are reported up. */
  onPreview?: (details: { brand: CardBrand | null; color: CardColor }) => void
}) {
  const [brand, setBrand] = useState<CardBrand | ''>(card.brand ?? '')
  const [period, setPeriod] = useState<Period>(card.interestRatePeriod ?? 'monthly')
  const [color, setColor] = useState<CardColor>(card.color ?? 'ink')
  const isCredit = kind === 'credit'

  return (
    <>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-brand`}>{m.card_brand()}</FieldLabel>
        <NativeSelect
          id={`${idPrefix}-brand`}
          name="brand"
          value={brand}
          onChange={(event) => {
            const next = event.target.value as CardBrand | ''
            setBrand(next)
            onPreview?.({ brand: next || null, color })
          }}
        >
          <option value="">{m.label_none()}</option>
          {cardBrands.map((brand) => (
            <option key={brand} value={brand}>
              {brandLabel(brand)}
            </option>
          ))}
        </NativeSelect>
      </Field>

      {isCredit && (
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-rate`}>{m.card_interest_rate()}</FieldLabel>
          <div className="flex flex-wrap items-start gap-3">
            <Input
              id={`${idPrefix}-rate`}
              name="interestRate"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              className="w-28"
              defaultValue={card.interestRateBps === null ? undefined : card.interestRateBps / 100}
            />
            <ToggleGroup
              type="single"
              size="sm"
              className="w-24"
              aria-label={m.card_rate_period()}
              value={period}
              onValueChange={(value) => setPeriod(value as Period)}
            >
              <ToggleGroupItem value="monthly">{m.card_rate_mv()}</ToggleGroupItem>
              <ToggleGroupItem value="annual">{m.card_rate_ea()}</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <input type="hidden" name="interestRatePeriod" value={period} />
          <FieldDescription>{m.card_rate_hint()}</FieldDescription>
        </Field>
      )}

      <Field>
        <FieldLabel id={`${idPrefix}-color`}>{m.card_color()}</FieldLabel>
        <ToggleGroup
          type="single"
          className="w-fit border-0"
          aria-labelledby={`${idPrefix}-color`}
          value={color}
          onValueChange={(value) => {
            const next = value as CardColor
            setColor(next)
            onPreview?.({ brand: brand || null, color: next })
          }}
        >
          {cardColors.map((name) => (
            <ToggleGroupItem
              key={name}
              value={name}
              className="size-10 grow-0 border border-line p-0 data-[state=on]:border-2 data-[state=on]:border-ink data-[state=on]:bg-transparent"
            >
              <span aria-hidden className="size-4 border border-line" style={{ backgroundColor: CARD_FACE_COLORS[name] }} />
              <span className="sr-only">{colorLabel(name)}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <input type="hidden" name="color" value={color} />
      </Field>

      {isCredit && (
        <>
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-limit`}>{m.label_limit()}</FieldLabel>
            <Input
              id={`${idPrefix}-limit`}
              name="limit"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              defaultValue={card.creditLimit ?? undefined}
            />
            <FieldDescription>{m.accounts_credit_only_hint()}</FieldDescription>
          </Field>
          <FieldGroup className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor={`${idPrefix}-statement-day`}>{m.label_statement_day()}</FieldLabel>
              <Input
                id={`${idPrefix}-statement-day`}
                name="statementDay"
                type="number"
                min="1"
                max="31"
                defaultValue={card.statementDay ?? undefined}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${idPrefix}-due-day`}>{m.label_due_day()}</FieldLabel>
              <Input id={`${idPrefix}-due-day`} name="dueDay" type="number" min="1" max="31" defaultValue={card.dueDay ?? undefined} />
            </Field>
          </FieldGroup>
        </>
      )}
    </>
  )
}
