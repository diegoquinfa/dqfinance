import { nextDueDate, type Frequency } from '../recurring-expenses/next-due-date.ts'

export type BillOccurrence = { day: string; amountCents: number }

/**
 * The money a recurring bill takes from today to `end`, inclusive. An overdue bill is still owed,
 * so it takes once, dated today, however many cycles were missed; the cycles from today on fall on
 * their own dates.
 */
export function billOccurrences(
  bill: { amountCents: number; startsOn: string; nextDueOn: string; frequency: Frequency },
  today: string,
  end: string,
): BillOccurrence[] {
  const occurrences: BillOccurrence[] = []
  if (bill.nextDueOn < today) occurrences.push({ day: today, amountCents: bill.amountCents })
  // A weekly bill falls more than once before the end; each occurrence from today on counts.
  for (let day = bill.nextDueOn; day <= end; ) {
    if (day >= today) occurrences.push({ day, amountCents: bill.amountCents })
    const next = nextDueDate(bill.startsOn, day, bill.frequency)
    // A due date that does not move on would add the bill for ever.
    if (next <= day) break
    day = next
  }
  return occurrences
}
