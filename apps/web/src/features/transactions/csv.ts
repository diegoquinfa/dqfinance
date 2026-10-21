/**
 * The CSV half of statement import (#6): a pure parser, a column guess, and the row mapping.
 * Nothing here touches the API: the page previews the result and the API decides duplicates.
 */

export type CsvTable = { headers: string[]; rows: string[][] }

export type ColumnMap = {
  date: number
  title: number
  amount: number
  /** A statement with its own type column, else null (the sign of the amount decides). */
  type: number | null
}

export type ParsedMovement = {
  type: 'income' | 'expense'
  amount: number
  occurredAt: string
  title?: string
  description?: string
}

/** The short label that names a movement in a list; the API caps it at the same length. */
export const TITLE_MAX = 120

/**
 * A statement line is the movement's title. A line longer than a title keeps its full
 * text as the description, so nothing the statement said is lost.
 */
export function splitTitle(text: string): { title: string; description?: string } {
  if (text.length <= TITLE_MAX) return { title: text }
  const head = text.slice(0, TITLE_MAX)
  const space = head.lastIndexOf(' ')
  return { title: (space > 0 ? head.slice(0, space) : head).trim(), description: text }
}

/** Splits one line: quoted fields keep their separator. */
function splitLine(line: string, separator: string): string[] {
  const values: string[] = []
  let value = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]!
    if (quoted) {
      if (character !== '"') value += character
      else if (line[index + 1] === '"') {
        value += '"'
        index += 1
      } else quoted = false
      continue
    }
    if (character === '"') quoted = true
    else if (character === separator) {
      values.push(value)
      value = ''
    } else value += character
  }
  values.push(value)
  return values.map((field) => field.trim())
}

/**
 * Reads a statement into its header and rows. The separator is sniffed from the first line.
 * shortcut: a quoted field cannot hold a line break; upgrade once a bank statement needs it.
 */
export function parseCsv(text: string): CsvTable {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')
  const [headerLine, ...rowLines] = lines
  if (!headerLine) return { headers: [], rows: [] }
  // A semicolon statement uses commas as decimal separators, so the first line is the safer sniff.
  const separator = headerLine.split(';').length > headerLine.split(',').length ? ';' : ','
  return { headers: splitLine(headerLine, separator), rows: rowLines.map((line) => splitLine(line, separator)) }
}

const word = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()

const DATE_WORDS = ['fecha', 'date', 'dia']
const TITLE_WORDS = [
  'descripcion',
  'description',
  'concepto',
  'concept',
  'detalle',
  'detail',
  'movimiento',
  'titulo',
  'title',
]
const AMOUNT_WORDS = ['monto', 'importe', 'amount', 'valor', 'value']
const TYPE_WORDS = ['tipo', 'type']

/** Where each column is, guessed from the header names; the map is editable in the page. */
export function detectColumns(headers: string[]): ColumnMap {
  const normalized = headers.map(word)
  const find = (words: string[]) => normalized.findIndex((header) => words.some((name) => header.includes(name)))
  const date = find(DATE_WORDS)
  const title = find(TITLE_WORDS)
  const amount = find(AMOUNT_WORDS)
  const type = find(TYPE_WORDS)
  return {
    date: date === -1 ? 0 : date,
    title: title === -1 ? 1 : title,
    amount: amount === -1 ? headers.length - 1 : amount,
    type: type === -1 ? null : type,
  }
}

/**
 * "1.234,56", "1,234.56", "$ 45.000" and "(1.200)" all become a signed number.
 * A lone separator with exactly three digits after it groups thousands; any other is a decimal one.
 */
export function parseAmount(raw: string): number | null {
  const text = raw.trim()
  const negative = text.startsWith('-') || (text.startsWith('(') && text.endsWith(')'))
  const digits = text.replace(/[^\d.,]/g, '')
  if (!/\d/.test(digits)) return null

  const comma = digits.includes(',')
  const dot = digits.includes('.')
  let value: string
  if (comma && dot) {
    // The rightmost separator is the decimal one; the other groups thousands.
    value =
      digits.lastIndexOf(',') > digits.lastIndexOf('.')
        ? digits.replaceAll('.', '').replace(',', '.')
        : digits.replaceAll(',', '')
  } else if (comma || dot) {
    const separator = comma ? ',' : '.'
    const groups = digits.split(separator)
    const groupsThousands = groups.length > 1 && groups.slice(1).every((group) => group.length === 3)
    value = groupsThousands ? groups.join('') : `${groups.slice(0, -1).join('')}.${groups.at(-1)}`
  } else value = digits

  const amount = Number(value)
  if (!Number.isFinite(amount)) return null
  return negative ? -Math.abs(amount) : amount
}

/** "2026-10-19" or "19/10/2026" (day first, as statements write it) to a calendar day. */
export function parseDay(raw: string): string | null {
  const text = raw.trim()
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text)
  const dayFirst = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text)
  const year = iso ? Number(iso[1]) : dayFirst ? Number(dayFirst[3]) : null
  const month = iso ? Number(iso[2]) : dayFirst ? Number(dayFirst[2]) : null
  const day = iso ? Number(iso[3]) : dayFirst ? Number(dayFirst[1]) : null
  if (year === null || month === null || day === null) return null
  // A real calendar day: the Date rollover catches 31/02 and friends.
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** The type column in either language. */
function movementType(raw: string): 'income' | 'expense' | null {
  const value = word(raw)
  if (['gasto', 'gastos', 'expense', 'expenses', 'debito', 'debit', 'cargo'].includes(value)) return 'expense'
  if (['ingreso', 'ingresos', 'income', 'credito', 'credit', 'abono'].includes(value)) return 'income'
  return null
}

/** The rows the API takes, in order. Rows without a date, an amount or a real type are left out. */
export function mapRows(table: CsvTable, columns: ColumnMap): { rows: ParsedMovement[]; skipped: number } {
  const rows: ParsedMovement[] = []
  let skipped = 0
  for (const row of table.rows) {
    const occurredAt = parseDay(row[columns.date] ?? '')
    const signed = parseAmount(row[columns.amount] ?? '')
    if (!occurredAt || signed === null || signed === 0) {
      skipped += 1
      continue
    }
    // Without a type column, a negative amount is money out.
    const type =
      columns.type === null ? null : movementType(row[columns.type] ?? '')
    const resolved = type ?? (signed < 0 ? 'expense' : 'income')
    const { title, description } = splitTitle((row[columns.title] ?? '').trim())
    rows.push({
      type: resolved,
      amount: Math.abs(signed),
      occurredAt,
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
    })
  }
  return { rows, skipped }
}
