import { sql, type SQL, type SQLWrapper } from 'drizzle-orm'

/**
 * The letters that carry a diacritic, folded to the ASCII letter under them. The SQL side cannot call
 * `normalize`, so one table serves both: the JS query and a chain of `replace` over the stored text.
 * Both cases are listed because SQLite's `lower()` folds ASCII only, so an upper-case accented
 * letter arrives at the chain unchanged.
 */
const FOLDED: ReadonlyArray<readonly [string, string]> = [
  ['á', 'a'], ['Á', 'a'], ['à', 'a'], ['À', 'a'], ['ä', 'a'], ['Ä', 'a'], ['â', 'a'], ['Â', 'a'],
  ['ã', 'a'], ['Ã', 'a'], ['å', 'a'], ['Å', 'a'],
  ['é', 'e'], ['É', 'e'], ['è', 'e'], ['È', 'e'], ['ë', 'e'], ['Ë', 'e'], ['ê', 'e'], ['Ê', 'e'],
  ['í', 'i'], ['Í', 'i'], ['ì', 'i'], ['Ì', 'i'], ['ï', 'i'], ['Ï', 'i'], ['î', 'i'], ['Î', 'i'],
  ['ó', 'o'], ['Ó', 'o'], ['ò', 'o'], ['Ò', 'o'], ['ö', 'o'], ['Ö', 'o'], ['ô', 'o'], ['Ô', 'o'],
  ['õ', 'o'], ['Õ', 'o'], ['ø', 'o'], ['Ø', 'o'],
  ['ú', 'u'], ['Ú', 'u'], ['ù', 'u'], ['Ù', 'u'], ['ü', 'u'], ['Ü', 'u'], ['û', 'u'], ['Û', 'u'],
  ['ñ', 'n'], ['Ñ', 'n'], ['ç', 'c'], ['Ç', 'c'],
  ['ý', 'y'], ['Ý', 'y'],
]

const byLetter = new Map(FOLDED)

/** The word without its diacritics, the way the user types it: "Educación" → "educacion". */
export const accentFree = (value: string) =>
  value
    .toLowerCase()
    .replace(/[\u00c0-\u024f]/g, (letter) => byLetter.get(letter) ?? letter)

/**
 * A text expression with its diacritics folded, so `like` compares the word the user typed against
 * the word the movement carries. No index can serve this comparison, so it is a scan with string
 * folding: acceptable at personal-ledger size.
 */
export const accentFreeSql = (column: SQLWrapper): SQL => {
  let expression = sql`lower(${column})`
  for (const [letter, ascii] of FOLDED) {
    expression = sql`replace(${expression}, ${sql.raw(`'${letter}'`)}, ${sql.raw(`'${ascii}'`)})`
  }
  return expression
}
