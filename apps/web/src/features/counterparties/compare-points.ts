import type { CounterpartyDetail } from "./counterparties-api";

/** One contact's monthly series, as the API already sends it for the detail page. */
export type CompareContact = {
  id: string;
  name: string;
  monthly: CounterpartyDetail["monthly"];
};

export type CompareMode = "spent" | "received";

/** One chart row: the month, then the value of each contact by id, then the total. */
export type ComparePoint = {
  month: string;
  label: string;
  total: number;
  [id: string]: string | number;
};

/**
 * The rows the comparison chart draws: one point per month, one value per contact and their total,
 * in one currency. Sums go through cents, so a month never drifts by a hundredth.
 * `label` names the month in the user's language, injected so this rule stays pure.
 */
export function comparePoints(
  contacts: CompareContact[],
  currency: string,
  mode: CompareMode,
  label: (month: string) => string,
): ComparePoint[] {
  const months = [
    ...new Set(
      contacts.flatMap((contact) =>
        contact.monthly
          .filter((row) => row.currency === currency)
          .map((row) => row.month),
      ),
    ),
  ].sort();
  const cents = new Map<string, Map<string, number>>();
  for (const contact of contacts) {
    const perMonth = new Map<string, number>();
    for (const row of contact.monthly) {
      if (row.currency !== currency) continue;
      perMonth.set(
        row.month,
        (perMonth.get(row.month) ?? 0) + Math.round(row[mode] * 100),
      );
    }
    cents.set(contact.id, perMonth);
  }
  return months.map((month) => {
    const point: ComparePoint = { month, label: label(month), total: 0 };
    for (const contact of contacts) {
      const value = cents.get(contact.id)?.get(month) ?? 0;
      point[contact.id] = value / 100;
      point.total = Math.round(point.total * 100 + value) / 100;
    }
    return point;
  });
}
