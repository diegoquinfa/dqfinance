/**
 * The source of a movement with its bank: "Bancolombia · Principal". Two accounts of different
 * banks can share a name, so the bank comes first. A cash wallet has no bank and shows its own
 * name alone.
 */
export const sourceLabel = (source: { name: string; bankName: string | null }) =>
  source.bankName ? `${source.bankName} · ${source.name}` : source.name
