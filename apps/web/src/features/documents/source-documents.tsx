import { Download, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { formatDate } from '#/shared/dates'
import { m } from '#/shared/i18n'
import { formatNumber } from '#/shared/money'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '#/shared/ui/alert-dialog'
import { Badge } from '#/shared/ui/badge'
import { Button } from '#/shared/ui/button'
import { DialogPanel } from '#/shared/ui/dialog-panel'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '#/shared/ui/empty'
import { Field, FieldError, FieldGroup, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { ListSkeleton } from '#/shared/ui/list-skeleton'
import { Section, rowsClass } from '#/shared/ui/page'
import { Spinner } from '#/shared/ui/spinner'
import type { SourceRef } from '../accounts/sources'
import {
  DOCUMENT_ACCEPT,
  MAX_DOCUMENT_BYTES,
  downloadDocument,
  useDeleteDocument,
  useDocuments,
  useUploadDocument,
  type SourceDocument,
} from './documents-api'

/** The tag of a row: the file kind, as the media type spells it. */
const typeTag = (contentType: string) => contentType.split('/')[1]?.toUpperCase() ?? contentType.toUpperCase()

const sizeLabel = (bytes: number) =>
  bytes >= 1024 * 1024
    ? m.document_size_mb({ size: formatNumber(bytes / (1024 * 1024)) })
    : m.document_size_kb({ size: Math.max(1, Math.round(bytes / 1024)) })

/** Upload: the picker checks what the API checks, so a rejected file never leaves the browser. */
function AddDocumentForm({ source, close }: { source: SourceRef; close: () => void }) {
  const upload = useUploadDocument(source)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) return setError(m.document_file_required())
    if (file.size > MAX_DOCUMENT_BYTES) return setError(m.error_document_too_large())
    setError(null)
    upload.mutate(
      { file, name: name.trim() || undefined },
      {
        onSuccess: () => {
          close()
          toast.success(m.toast_document_added())
        },
        onError: (failure) => setError(failure instanceof Error ? failure.message : m.error_generic()),
      },
    )
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor="document-file">{m.document_file()}</FieldLabel>
          <Input
            id="document-file"
            type="file"
            accept={DOCUMENT_ACCEPT}
            aria-invalid={Boolean(error)}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="document-name">{`${m.label_name()} (${m.label_optional()})`}</FieldLabel>
          <Input
            id="document-name"
            value={name}
            maxLength={200}
            placeholder={file?.name ?? ''}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <FieldError>{error}</FieldError>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            {m.action_cancel()}
          </Button>
          <Button type="submit" disabled={upload.isPending}>
            {upload.isPending && <Spinner data-icon="inline-start" />}
            {m.action_add()}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

/** Delete asks first: the file and its row are gone for good. */
function DeleteDocument({ file, source }: { file: SourceDocument; source: SourceRef }) {
  const remove = useDeleteDocument(source)
  const [error, setError] = useState<string | null>(null)

  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="ghost" size="icon">
            <Trash2 aria-hidden />
            <span className="sr-only">{m.document_delete({ name: file.name })}</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.document_delete_title()}</AlertDialogTitle>
            <AlertDialogDescription>{m.document_delete_description()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{m.action_cancel()}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                remove.mutate(file.id, {
                  onSuccess: () => toast.success(m.toast_document_deleted()),
                  onError: (failure) => setError(failure instanceof Error ? failure.message : m.error_generic()),
                })
              }
            >
              {m.action_delete()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && <FieldError>{error}</FieldError>}
    </>
  )
}

/** The files attached to one source: contract, terms, fee table (#5). */
export function SourceDocuments({ source, index }: { source: SourceRef; index: string }) {
  const documents = useDocuments(source)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  /** The API is another origin and sends the file as an attachment, so it arrives as a blob. */
  async function save(item: SourceDocument) {
    setError(null)
    setDownloading(item.id)
    try {
      const url = URL.createObjectURL(await downloadDocument(item.id))
      const link = window.document.createElement('a')
      link.href = url
      link.download = item.name
      link.click()
      URL.revokeObjectURL(url)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : m.error_generic())
    } finally {
      setDownloading(null)
    }
  }

  return (
    <Section
      index={index}
      label={m.source_documents()}
      action={
        <DialogPanel
          trigger={<Button variant="link">{m.document_add()}</Button>}
          title={m.document_add()}
          description={m.document_file_hint()}
        >
          {(close) => <AddDocumentForm source={source} close={close} />}
        </DialogPanel>
      }
    >
      {error && <FieldError className="pb-4">{error}</FieldError>}
      {documents.isPending ? (
        <ListSkeleton rows={2} />
      ) : documents.error ? (
        <p role="alert" className="text-sm text-destructive">
          {documents.error.message}
        </p>
      ) : documents.data.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{m.source_documents_empty()}</EmptyTitle>
            <EmptyDescription>{m.source_documents_empty_description()}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className={rowsClass}>
          {documents.data.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="truncate text-ink">{item.name}</p>
                <p className="label-mono flex flex-wrap items-center gap-2 text-muted-foreground">
                  <Badge variant="secondary">{typeTag(item.contentType)}</Badge>
                  <span className="tabular-nums">{sizeLabel(item.sizeBytes)}</span>
                  <span aria-hidden className="text-faint">
                    /
                  </span>
                  <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={downloading === item.id}
                  onClick={() => void save(item)}
                >
                  <Download aria-hidden />
                  <span className="sr-only">{m.document_download({ name: item.name })}</span>
                </Button>
                <DeleteDocument file={item} source={source} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
