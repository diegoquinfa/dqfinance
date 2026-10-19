import { m } from '#/shared/i18n'
import type { CounterpartyKind } from './counterparties-api'

/**
 * The kind is a tag, not a word: PERSONA or COMERCIO. Kept out of the component file: a
 * non-component export there defeats Fast Refresh.
 */
export const kindTag = (kind: CounterpartyKind) =>
  kind === 'person' ? m.contacts_tag_person() : m.contacts_tag_business()
