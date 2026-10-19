import { z } from 'zod'

/** A rate in basis points: 10000 bps = 100%. */
export const rateBps = z.number().int().min(0).max(100_000)
