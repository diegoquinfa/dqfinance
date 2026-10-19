import { sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { ownerId } from '../auth/owner'
import { createdAt, id } from '../../shared/schema-columns'

export const COUNTERPARTY_KINDS = ['person', 'business'] as const

/** Who money went to or came from (GLOSSARY.md → Counterparty). Shown as "Contacts" and "Businesses". */
export const counterparty = sqliteTable('counterparty', {
  id: id(),
  userId: ownerId(),
  name: text('name').notNull(),
  kind: text('kind', { enum: COUNTERPARTY_KINDS }).notNull(),
  createdAt: createdAt(),
})
