import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../../db'
import { isoDate, todayIn } from '../../shared/dates'
import { AppError } from '../../shared/http'
import { fromCents, toCents } from '../../shared/money'
import { card } from '../accounts/account.schema'
import { resolveSource } from '../accounts/source'
import { requireSettings } from '../settings/get-settings'
import { cardStatement } from './card-statement.schema'
import { dueOnAfter, lastCutOn } from './statement-dates'

export const recordCardStatementInput = z.object({
  cardId: z.string().min(1).describe('The credit card the statement is for'),
  payment: z
    .number()
    .min(0)
    .max(1e12)
    .multipleOf(0.01)
    .describe("What the user will pay, in the card's currency (decimal, not cents): the statement's minimum payment, or more"),
  closedOn: isoDate.optional().describe("The cut the statement closed on (YYYY-MM-DD); defaults to the card's last cut"),
  dueOn: isoDate.optional().describe("The day it must be paid (YYYY-MM-DD); defaults to the card's payment day after the cut"),
})

/**
 * Records what a credit card's statement asks for. One statement per card and cut: recording the
 * same cut again replaces it, which is how a mistyped amount is corrected.
 */
export async function recordCardStatement(db: Db, userId: string, input: z.infer<typeof recordCardStatementInput>) {
  const source = await resolveSource(db, userId, { type: 'card', id: input.cardId })
  if (source.cardKind !== 'credit') throw new AppError('credit_card_required')
  const days = (await db
    .select({ statementDay: card.statementDay, dueDay: card.dueDay })
    .from(card)
    .where(and(eq(card.id, input.cardId), eq(card.userId, userId)))
    .get())!
  const settings = await requireSettings(db, userId)

  const closedOn = input.closedOn ?? (days.statementDay ? lastCutOn(todayIn(settings.timezone), days.statementDay) : null)
  const dueOn = input.dueOn ?? (closedOn && days.dueDay ? dueOnAfter(closedOn, days.dueDay) : null)
  // A card without its cut or payment day cannot place the statement on its own.
  if (!closedOn || !dueOn) throw new AppError('statement_dates_required')
  if (dueOn < closedOn) throw new AppError('invalid_input', 400, [{ path: ['dueOn'], message: 'Before the cut' }])

  const paymentCents = toCents(input.payment)
  const [row] = await db
    .insert(cardStatement)
    .values({ userId, cardId: input.cardId, closedOn, dueOn, paymentCents })
    .onConflictDoUpdate({ target: [cardStatement.cardId, cardStatement.closedOn], set: { dueOn, paymentCents } })
    .returning()
  return {
    id: row!.id,
    cardId: row!.cardId,
    closedOn: row!.closedOn,
    dueOn: row!.dueOn,
    currency: source.currency,
    payment: fromCents(row!.paymentCents),
  }
}
