import type { CategoryIcon, PaletteColor } from '@dqfinance/api/appearance'
import { cn } from 'cn'
import {
  Book,
  Briefcase,
  Car,
  Film,
  Gift,
  HeartPulse,
  House,
  Music,
  Plane,
  ShoppingBag,
  Utensils,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { m } from '#/shared/i18n'

/**
 * The icon a category can carry, by the slug the API stores. The list itself lives in the API
 * package, so the web never keeps a second copy of it.
 */
export const CATEGORY_ICON_COMPONENTS: Record<CategoryIcon, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  house: House,
  'shopping-bag': ShoppingBag,
  film: Film,
  music: Music,
  'heart-pulse': HeartPulse,
  briefcase: Briefcase,
  plane: Plane,
  gift: Gift,
  book: Book,
  wallet: Wallet,
}

/**
 * The category-mark palette: the only colors in the app that are not tokens, and they live here
 * alone. A mark is a small dot on the canvas, so the card-face tones are too dim to read there.
 * (DESIGN.md is updated separately to allow this palette.)
 */
export const CATEGORY_MARK_COLORS: Record<PaletteColor, string> = {
  ink: '#8d8d88',
  signal: '#a78bfa',
  sand: '#d7b978',
  moss: '#8fc08c',
  clay: '#d9927b',
  ocean: '#7fb2d6',
}

/** The colors the picker offers. */
export const categoryColors = Object.keys(CATEGORY_MARK_COLORS) as PaletteColor[]

const colorLabels = {
  ink: m.color_ink,
  signal: m.color_signal,
  sand: m.color_sand,
  moss: m.color_moss,
  clay: m.color_clay,
  ocean: m.color_ocean,
} satisfies Record<PaletteColor, () => string>

/** The name of a color, for the picker. A color the app does not know has no name. */
export function colorLabel(color: string | null): string | null {
  if (!color || !(color in colorLabels)) return null
  return colorLabels[color as PaletteColor]()
}

/** The icon a category carries, when the app knows it. */
export function categoryIcon(icon: string | null): CategoryIcon | null {
  return icon && icon in CATEGORY_ICON_COMPONENTS ? (icon as CategoryIcon) : null
}

/** The color a category carries, when the app knows it. */
export function categoryColor(color: string | null): PaletteColor | null {
  return color && color in CATEGORY_MARK_COLORS ? (color as PaletteColor) : null
}

/** The tone of a color, for the dot. An unknown color has none. */
function markTone(color: string | null): string | undefined {
  const known = categoryColor(color)
  return known ? CATEGORY_MARK_COLORS[known] : undefined
}

/**
 * The mark of a category: its color as a dot, its icon beside it when it has one. It says nothing
 * on its own, so it is hidden from screen readers: the name is already written next to it.
 */
export function CategoryMark({
  icon,
  color,
  className,
}: {
  icon: string | null
  color: string | null
  className?: string
}) {
  const Icon =
    icon && icon in CATEGORY_ICON_COMPONENTS ? CATEGORY_ICON_COMPONENTS[icon as CategoryIcon] : undefined
  const tone = markTone(color)
  return (
    <span aria-hidden className={cn('inline-flex shrink-0 items-center gap-1', className)}>
      {tone && <span className="size-2 rounded-full" style={{ backgroundColor: tone }} />}
      {Icon && <Icon className="size-3.5 text-muted-foreground" />}
    </span>
  )
}
