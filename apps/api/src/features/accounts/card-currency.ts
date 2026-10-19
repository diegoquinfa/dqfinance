import { sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { transaction } from '../transactions/transaction.schema'
import { product } from './account.schema'

/**
 * The currency rule of a movement, in one place. A foreign card charge is expressed in the card's
 * currency, so the amount and the currency of a movement depend on the card behind it.
 *
 * A query that uses these must left-join `card` on `transaction.cardId` and then `cardProduct`
 * on `card.productId`.
 */

/** The product behind a card, aliased so a query can read its currency. */
export const cardProduct = alias(product, 'card_product')

/** The currency of a movement: the card's currency when the charge was foreign, else its own. */
export const movementCurrency = sql<string>`case when ${transaction.primaryAmountCents} is null then ${transaction.currency} else coalesce(${cardProduct.currency}, ${transaction.currency}) end`

/** The amount of a movement, in that same currency. */
export const movementAmount = sql<number>`coalesce(${transaction.primaryAmountCents}, ${transaction.amountCents})`
