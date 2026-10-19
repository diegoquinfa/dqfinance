import { text } from 'drizzle-orm/sqlite-core'
import { user } from './auth.schema'

/** `user_id` column for every user-owned table; rows are deleted with their user. */
export const ownerId = () =>
  text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' })
