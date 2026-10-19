// Percent ↔ basis points, for the two rate fields (a product's E.A. rate, a card's interest rate).
// 100 bps = 1 %; the API only stores integers, so a typed percent rounds to the basis point.

export const bpsToPercent = (bps: number) => bps / 100

export const percentToBps = (percent: number) => Math.round(percent * 100)
