/**
 * The words of a search that carry meaning. "expenses at Web Sunday" is a phrase with filler in it,
 * and dropping the filler still finds the movement.
 */
const FILLER = new Set([
  // English
  'at',
  'in',
  'on',
  'the',
  'and',
  'for',
  'with',
  'of',
  'my',
  'me',
  'all',
  'expense',
  'expenses',
  'income',
  'incomes',
  'movement',
  'movements',
  'payment',
  'payments',
  'spend',
  'spent',
  // Spanish
  'en',
  'de',
  'del',
  'la',
  'el',
  'los',
  'las',
  'y',
  'a',
  'gasto',
  'gastos',
  'ingreso',
  'ingresos',
  'movimiento',
  'movimientos',
  'pago',
  'pagos',
  'compra',
  'compras',
])

/**
 * The words of a query that carry meaning, in the order they were typed. Punctuation splits words,
 * so "web-sunday" is two words and the `%` of a LIKE never reaches the query. A query of only
 * filler words has no words left: it matches everything instead of nothing.
 */
export const searchTerms = (query: string): string[] =>
  query
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 1 && !FILLER.has(word.toLowerCase()))
