/**
 * Presentation choices the API stores by name. The web maps each name to a look, so the API never
 * carries a color or an icon it cannot draw.
 */

/** The palette the app draws with: card faces and category marks use these names. */
export const PALETTE_COLORS = ['ink', 'signal', 'sand', 'moss', 'clay', 'ocean'] as const

/** The icons a category can carry, by lucide name. */
export const CATEGORY_ICONS = [
  'utensils',
  'car',
  'house',
  'shopping-bag',
  'film',
  'music',
  'heart-pulse',
  'briefcase',
  'plane',
  'gift',
  'book',
  'wallet',
] as const

export type PaletteColor = (typeof PALETTE_COLORS)[number]
export type CategoryIcon = (typeof CATEGORY_ICONS)[number]
