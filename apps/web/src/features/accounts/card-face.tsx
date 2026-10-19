import { cn } from 'cn'
import { m } from '#/shared/i18n'
import type { AccountsTree } from './accounts-api'

type CardRow = AccountsTree['banks'][number]['accounts'][number]['products'][number]['cards'][number]

export type CardBrand = NonNullable<CardRow['brand']>
export type CardColor = NonNullable<CardRow['color']>

/**
 * The only colors in the app that are not tokens, and they paint card faces alone (DESIGN.md).
 * The API stores the name of a color; the face is the one place that name becomes a look.
 */
export const CARD_FACE_COLORS = {
  ink: '#1c1c1c',
  signal: '#3b2f57',
  sand: '#4a3f28',
  moss: '#27392b',
  clay: '#432823',
  ocean: '#1e3241',
} satisfies Record<CardColor, string>

export const cardColors = Object.keys(CARD_FACE_COLORS) as CardColor[]

const brandLabels = {
  visa: m.card_brand_visa,
  mastercard: m.card_brand_mastercard,
  amex: m.card_brand_amex,
  diners: m.card_brand_diners,
  other: m.card_brand_other,
} satisfies Record<CardBrand, () => string>

export const cardBrands = Object.keys(brandLabels) as CardBrand[]

export const brandLabel = (brand: CardBrand | null) => (brand ? brandLabels[brand]() : null)

const colorLabels = {
  ink: m.card_color_ink,
  signal: m.card_color_signal,
  sand: m.card_color_sand,
  moss: m.card_color_moss,
  clay: m.card_color_clay,
  ocean: m.card_color_ocean,
} satisfies Record<CardColor, () => string>

export const colorLabel = (color: CardColor) => colorLabels[color]()

/** The card as it would look in a wallet: its color, its brand, its last four digits. */
export function CardFace({
  name,
  last4,
  brand,
  color,
  className,
}: {
  name: string
  last4: string | null
  brand: CardBrand | null
  color: CardColor | null
  className?: string
}) {
  return (
    <div
      role="img"
      aria-label={m.card_face_label({ name })}
      className={cn(
        'flex aspect-[1.586] w-full max-w-sm flex-col justify-between border border-line p-5',
        className,
      )}
      style={{ backgroundColor: CARD_FACE_COLORS[color ?? 'ink'] }}
    >
      <p className="label-mono text-soft">{brandLabel(brand)}</p>
      <div className="grid gap-2">
        <p aria-hidden className="label-mono text-ink">{`•••• •••• •••• ${last4 ?? '••••'}`}</p>
        <p className="label-mono text-soft">{name}</p>
      </div>
    </div>
  )
}
