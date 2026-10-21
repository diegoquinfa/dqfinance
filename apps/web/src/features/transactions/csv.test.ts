import assert from 'node:assert/strict'
import { test } from 'node:test'
import { detectColumns, mapRows, parseAmount, parseCsv, parseDay, splitTitle, TITLE_MAX } from './csv.ts'

test('parseCsv keeps separators inside quoted fields, in both separators', () => {
  const quoted = parseCsv('date,description,amount\n2026-10-19,"Rent, October",-450000\n')
  assert.deepEqual(quoted.headers, ['date', 'description', 'amount'])
  assert.deepEqual(quoted.rows, [['2026-10-19', 'Rent, October', '-450000']])

  const semicolons = parseCsv('Fecha;Descripcion;Monto\n19/10/2026;Cafe;12,50\n')
  assert.deepEqual(semicolons.headers, ['Fecha', 'Descripcion', 'Monto'])
  assert.deepEqual(semicolons.rows, [['19/10/2026', 'Cafe', '12,50']])
})

test('parseCsv drops blank lines and doubles a quoted quote', () => {
  const table = parseCsv('a,b\n\n1,"say ""hi"""\n')
  assert.deepEqual(table.rows, [['1', 'say "hi"']])
})

test('parseAmount reads decimal commas, thousands and a parenthesized negative', () => {
  assert.equal(parseAmount('45.000,50'), 45000.5)
  assert.equal(parseAmount('1,234.56'), 1234.56)
  assert.equal(parseAmount('$ 1.234'), 1234)
  assert.equal(parseAmount('12,50'), 12.5)
  assert.equal(parseAmount('-450000'), -450000)
  assert.equal(parseAmount('(1.200)'), -1200)
  assert.equal(parseAmount('no amount'), null)
})

test('parseDay takes both statement formats and rejects impossible days', () => {
  assert.equal(parseDay('2026-10-19'), '2026-10-19')
  assert.equal(parseDay('19/10/2026'), '2026-10-19')
  assert.equal(parseDay('05/02/2026'), '2026-02-05')
  assert.equal(parseDay('31/02/2026'), null)
  assert.equal(parseDay('2026-1-2'), '2026-01-02')
  assert.equal(parseDay('tomorrow'), null)
})

test('detectColumns guesses the map, in either language', () => {
  assert.deepEqual(detectColumns(['Fecha', 'Descripcion', 'Tipo', 'Monto']), {
    date: 0,
    title: 1,
    amount: 3,
    type: 2,
  })
  assert.deepEqual(detectColumns(['Date', 'Details', 'Value']), { date: 0, title: 1, amount: 2, type: null })
})

test('mapRows signs the rows and reports what it could not read', () => {
  const table = parseCsv('date,description,amount\n2026-10-19,Salary,3200000\n2026-10-20,Rent,-450000\n2026-10-21,Broken,\n')
  const mapped = mapRows(table, detectColumns(table.headers))
  assert.deepEqual(mapped.rows, [
    { type: 'income', amount: 3200000, occurredAt: '2026-10-19', title: 'Salary' },
    { type: 'expense', amount: 450000, occurredAt: '2026-10-20', title: 'Rent' },
  ])
  assert.equal(mapped.skipped, 1)
})

test('mapRows prefers a type column but falls back to the sign', () => {
  const table = parseCsv('date,type,description,amount\n2026-10-19,gasto,Fee,12000\n2026-10-20,,Refund,-30000\n')
  const mapped = mapRows(table, detectColumns(table.headers))
  assert.deepEqual(mapped.rows, [
    { type: 'expense', amount: 12000, occurredAt: '2026-10-19', title: 'Fee' },
    { type: 'expense', amount: 30000, occurredAt: '2026-10-20', title: 'Refund' },
  ])
})

test('splitTitle keeps a short line whole and a long one as the description', () => {
  assert.deepEqual(splitTitle('Salary'), { title: 'Salary' })
  const long = `${'word '.repeat(40)}end`
  const split = splitTitle(long)
  assert.equal(split.title.length <= TITLE_MAX, true)
  assert.equal(split.description, long)
})
