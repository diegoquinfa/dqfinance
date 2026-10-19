import { Link, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { SourceSelect } from '#/features/accounts/source-select'
import { useSources } from '#/features/accounts/sources'
import { formatDay } from '#/shared/dates'
import { m } from '#/shared/i18n'
import { formatSignedAmount } from '#/shared/money'
import { Badge } from '#/shared/ui/badge'
import { Button } from '#/shared/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '#/shared/ui/empty'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { ListSkeleton } from '#/shared/ui/list-skeleton'
import { NativeSelect } from '#/shared/ui/native-select'
import { PageHeader, Section } from '#/shared/ui/page'
import { Spinner } from '#/shared/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/shared/ui/table'
import { Textarea } from '#/shared/ui/textarea'
import { detectColumns, mapRows, parseCsv, type ColumnMap } from './csv'
import { useImportPreview, useImportTransactions } from './transactions-api'

/** One column picker; the type column may be "None", when the sign of the amount decides. */
function ColumnField({
  id,
  label,
  headers,
  value,
  optional = false,
  onChange,
}: {
  id: string
  label: string
  headers: string[]
  value: number | null
  optional?: boolean
  onChange: (value: number | null) => void
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect
        id={id}
        value={value === null ? '' : String(value)}
        onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
      >
        {optional && <option value="">{m.label_none()}</option>}
        {headers.map((header, index) => (
          <option key={index} value={index}>
            {header || String(index + 1)}
          </option>
        ))}
      </NativeSelect>
    </Field>
  )
}

/** #6: a CSV statement becomes movements, reviewed before anything is written. */
export function ImportPage() {
  const navigate = useNavigate()
  const { sources } = useSources()
  const [sourceKey, setSourceKey] = useState('')
  const [text, setText] = useState('')
  const [map, setMap] = useState<ColumnMap | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const table = useMemo(() => parseCsv(text), [text])
  // null means untouched: the guessed map, until the user picks a column.
  const columns = map ?? detectColumns(table.headers)
  const { rows, skipped } = useMemo(() => mapRows(table, columns), [table, columns])
  const source = sources.find((item) => item.key === sourceKey)

  const previewInput = useMemo(
    () => (source && rows.length ? { source: source.ref, rows, dryRun: true } : null),
    [source, rows],
  )
  const preview = useImportPreview(previewInput)
  const importRows = useImportTransactions()

  const previewRows = preview.data?.rows ?? []
  const duplicates = previewRows.filter((row) => row.duplicate).length
  // Duplicates stay visible but out of the import.
  const fresh = rows.filter((_, index) => !previewRows[index]?.duplicate)
  const ready = Boolean(preview.data) && !preview.isFetching

  /** A new statement means new columns, so the guessed map comes back. */
  function readStatement(value: string) {
    setText(value)
    setMap(null)
  }

  async function chooseFile(file: File | undefined) {
    if (!file) return
    setFileError(null)
    try {
      readStatement(await file.text())
    } catch {
      setFileError(m.error_generic())
    }
  }

  function submit() {
    if (!source || !fresh.length) return
    importRows.mutate(
      { source: source.ref, rows: fresh, dryRun: false },
      {
        onSuccess: (result) => {
          toast.success(m.import_done({ created: result.created, skipped: result.skipped }))
          void navigate({ to: '/transactions' })
        },
      },
    )
  }

  return (
    <>
      <nav aria-label={m.nav_transactions()} className="pt-6 md:pt-10">
        <Link to="/transactions" className="label-mono group inline-flex gap-2 text-muted-foreground hover:text-ink">
          <span aria-hidden className="transition-transform duration-500 group-hover:-translate-x-1">
            ←
          </span>
          {m.nav_transactions()}
        </Link>
      </nav>

      <PageHeader title={m.import_title()}>
        <p className="text-sm text-muted-foreground">{m.import_intro()}</p>
      </PageHeader>

      <Section index="01" label={m.label_source()}>
        <SourceSelect
          id="import-source"
          label={m.label_source()}
          hint={m.transactions_pick_source()}
          options={sources}
          value={sourceKey}
          onChange={setSourceKey}
          className="max-w-md"
        />
      </Section>

      <Section index="02" label={m.import_statement()}>
        <FieldGroup className="max-w-2xl">
          <Field>
            <FieldLabel htmlFor="import-text">{m.import_paste()}</FieldLabel>
            <Textarea
              id="import-text"
              value={text}
              spellCheck={false}
              onChange={(event) => readStatement(event.target.value)}
            />
            <FieldDescription>{m.import_paste_hint()}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="import-file">{m.import_file()}</FieldLabel>
            <Input
              id="import-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => void chooseFile(event.target.files?.[0])}
            />
          </Field>
        </FieldGroup>
        {fileError && (
          <p role="alert" className="pt-4 text-sm text-destructive">
            {fileError}
          </p>
        )}
        <p className="max-w-2xl pt-4 text-sm text-muted-foreground">{m.import_assistant_note()}</p>
      </Section>

      {table.headers.length > 0 && (
        <Section index="03" label={m.import_columns()}>
          <FieldGroup className="max-w-2xl sm:grid sm:grid-cols-2">
            <ColumnField
              id="import-column-date"
              label={m.label_date()}
              headers={table.headers}
              value={columns.date}
              onChange={(value) => setMap({ ...columns, date: value ?? 0 })}
            />
            <ColumnField
              id="import-column-description"
              label={m.label_description()}
              headers={table.headers}
              value={columns.description}
              onChange={(value) => setMap({ ...columns, description: value ?? 0 })}
            />
            <ColumnField
              id="import-column-amount"
              label={m.label_amount()}
              headers={table.headers}
              value={columns.amount}
              onChange={(value) => setMap({ ...columns, amount: value ?? 0 })}
            />
            <ColumnField
              id="import-column-type"
              label={m.label_kind()}
              headers={table.headers}
              value={columns.type}
              optional
              onChange={(value) => setMap({ ...columns, type: value })}
            />
          </FieldGroup>
          <p className="max-w-2xl pt-4 text-sm text-muted-foreground">{m.import_columns_hint()}</p>
        </Section>
      )}

      <Section
        index={table.headers.length > 0 ? '04' : '03'}
        label={m.import_preview()}
        action={
          <Button variant="outline" disabled={!ready || !fresh.length || importRows.isPending} onClick={submit}>
            {importRows.isPending && <Spinner data-icon="inline-start" />}
            {m.import_submit({ count: fresh.length })}
          </Button>
        }
      >
        {!source || !rows.length ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{m.import_empty()}</EmptyTitle>
              <EmptyDescription>{m.import_intro()}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : preview.isPending ? (
          <ListSkeleton rows={4} />
        ) : preview.error ? (
          <p role="alert" className="text-sm text-destructive">
            {preview.error.message}
          </p>
        ) : (
          <div className="grid gap-4" aria-busy={preview.isFetching}>
            <Table aria-label={m.import_preview()}>
              <TableHeader>
                <TableRow>
                  <TableHead>{m.label_date()}</TableHead>
                  <TableHead>{m.label_description()}</TableHead>
                  <TableHead className="hidden sm:table-cell">{m.label_category()}</TableHead>
                  <TableHead className="text-right">{m.label_amount()}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, index) => (
                  <TableRow key={index} className={row.duplicate ? 'text-muted-foreground' : undefined}>
                    <TableCell className="label-mono whitespace-nowrap tabular-nums">
                      <time dateTime={row.occurredAt}>{formatDay(row.occurredAt.slice(0, 10))}</time>
                    </TableCell>
                    <TableCell className="text-ink">
                      <span className="flex flex-wrap items-center gap-2">
                        {row.description || row.categoryName}
                        {row.duplicate && <Badge variant="outline">{m.import_duplicate()}</Badge>}
                        {/* The category column drops below sm so four columns fit a phone. */}
                        <span className="label-mono text-muted-foreground sm:hidden">{row.categoryName}</span>
                      </span>
                    </TableCell>
                    <TableCell className="hidden label-mono text-muted-foreground sm:table-cell">{row.categoryName}</TableCell>
                    <TableCell
                      className={
                        row.type === 'income'
                          ? 'text-right font-medium text-income tabular-nums'
                          : 'text-right font-medium tabular-nums'
                      }
                    >
                      <span className="sr-only">{row.type === 'income' ? m.label_income() : m.label_expense()}: </span>
                      {formatSignedAmount(row.type, row.amount, source.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-sm text-muted-foreground">
              {skipped > 0 && <span>{m.import_rows_skipped({ count: skipped })} </span>}
              {duplicates > 0 && <span>{m.import_duplicates({ count: duplicates })}</span>}
            </p>
          </div>
        )}
      </Section>
    </>
  )
}
