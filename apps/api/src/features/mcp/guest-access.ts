import { eq } from 'drizzle-orm'
import type { Db } from '../../db'
import { user } from '../auth/auth.schema'
import { blocksMcp } from './guest-rule'

/**
 * The check lives here and not only at the authorization endpoint, so a token that was issued
 * some other way (a guest that signed up, and whose user no longer exists) is refused too.
 */
export async function guestBlocksMcp(db: Db, userId: string): Promise<boolean> {
  const row = await db.select({ isAnonymous: user.isAnonymous }).from(user).where(eq(user.id, userId)).get()
  return blocksMcp(row)
}
