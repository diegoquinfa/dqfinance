/**
 * What a yearly bill sets aside every month: a twelfth of its amount, so the money is there when
 * the bill comes. The cents left over by the division stay with the bill.
 */
export const monthlySetAside = (amountCents: number): number => Math.floor(amountCents / 12)
