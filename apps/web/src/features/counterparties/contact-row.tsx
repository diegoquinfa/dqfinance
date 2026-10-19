import { Link } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { formatDate } from '#/shared/dates'
import { m } from '#/shared/i18n'
import { formatSignedAmount } from '#/shared/money'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/shared/ui/alert-dialog'
import { Badge } from '#/shared/ui/badge'
import { Button } from '#/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/shared/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/shared/ui/dropdown-menu'
import { Field, FieldError, FieldGroup, FieldLabel } from '#/shared/ui/field'
import { Input } from '#/shared/ui/input'
import { Spinner } from '#/shared/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '#/shared/ui/toggle-group'
import { toast } from 'sonner'
import {
  useDeleteCounterparty,
  useUpdateCounterparty,
  type Counterparty,
  type CounterpartyKind,
} from './counterparties-api'

/** The kind is a tag, not a word: PERSONA or COMERCIO. */
export const kindTag = (kind: CounterpartyKind) =>
  kind === 'person' ? m.contacts_tag_person() : m.contacts_tag_business()

/**
 * What moved with a contact, per currency. Money never mixes currencies, so the primary
 * currency leads and the others are smaller lines below it.
 */
export function ContactTotals({
  contact,
  primaryCurrency,
  size = 'row',
}: {
  contact: Counterparty
  /** The user's main currency leads the block; the page lifts it so a list subscribes once. */
  primaryCurrency?: string
  size?: 'row' | 'page'
}) {
  const lead = contact.totals.find((total) => total.currency === primaryCurrency) ?? contact.totals[0]
  const others = contact.totals.filter((total) => total !== lead)
  if (!lead) return null
  const amountClass = size === 'page' ? 'type-heading font-medium' : 'font-medium'
  return (
    <div className={size === 'page' ? 'flex flex-col items-start gap-2' : 'flex flex-col items-end gap-1'}>
      {lead.spent > 0 && (
        <p className={`${amountClass} text-ink tabular-nums`}>
          <span className="sr-only">{m.label_expense()}: </span>
          {formatSignedAmount('expense', lead.spent, lead.currency)}
        </p>
      )}
      {lead.received > 0 && (
        <p className={`${amountClass} text-income tabular-nums`}>
          <span className="sr-only">{m.label_income()}: </span>
          {formatSignedAmount('income', lead.received, lead.currency)}
        </p>
      )}
      {others.map((total) => (
        <p key={total.currency} className="label-mono tabular-nums">
          {total.spent > 0 && (
            <>
              <span className="sr-only">{m.label_expense()}: </span>
              <span className="text-muted-foreground">{formatSignedAmount('expense', total.spent, total.currency)}</span>
            </>
          )}
          {total.spent > 0 && total.received > 0 && (
            <span aria-hidden className="mx-2 text-faint">
              /
            </span>
          )}
          {total.received > 0 && (
            <>
              <span className="sr-only">{m.label_income()}: </span>
              <span className="text-income">{formatSignedAmount('income', total.received, total.currency)}</span>
            </>
          )}
        </p>
      ))}
    </div>
  )
}

/** One contact: the kind tag, the name, the money that moved and when it last moved. */
export function ContactRow({
  contact,
  primaryCurrency,
  listSearch,
}: {
  contact: Counterparty
  primaryCurrency?: string
  /** The list's filters, carried to the detail page so going back keeps them. */
  listSearch?: { kind?: 'all' | 'person' | 'business'; search?: string }
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-4">
      <Link
        to="/contacts/$id"
        params={{ id: contact.id }}
        search={listSearch}
        className="group grid min-w-0 basis-full grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 sm:basis-0 sm:flex-1"
      >
        <span className="col-start-1 row-start-1 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="truncate text-ink transition-transform duration-500 group-hover:translate-x-1 sm:type-heading-sm">
            {contact.name}
          </span>
          <Badge variant="secondary">{kindTag(contact.kind)}</Badge>
        </span>
        <div className="col-start-2 row-start-1">
          <ContactTotals contact={contact} primaryCurrency={primaryCurrency} />
        </div>
        <span className="col-start-1 row-start-2 label-mono text-muted-foreground">
          {contact.movements === 0 ? (
            m.contacts_no_movements()
          ) : (
            <>
              {m.contacts_movements({ count: contact.movements })}
              {contact.lastMovementAt && (
                <>
                  <span aria-hidden className="mx-2 text-faint">
                    /
                  </span>
                  <time dateTime={contact.lastMovementAt}>{formatDate(contact.lastMovementAt)}</time>
                </>
              )}
            </>
          )}
        </span>
      </Link>
      <ContactMenu contact={contact} />
    </li>
  )
}

/** The row menu: rename the contact or delete it. */
function ContactMenu({ contact }: { contact: Counterparty }) {
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="link">
            {m.contacts_menu()}
            {/* Every row has the same visible word, so the name tells them apart when read aloud. */}
            <span className="sr-only"> {contact.name}</span>
            <ChevronDown aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setRenaming(true)}>{m.contacts_rename()}</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
            {m.action_delete()}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RenameContactDialog contact={contact} open={renaming} onOpenChange={setRenaming} />
      <DeleteContactDialog contact={contact} open={deleting} onOpenChange={setDeleting} />
    </>
  )
}

/** The name and the kind of a contact, prefilled. */
function RenameContactDialog({
  contact,
  open,
  onOpenChange,
}: {
  contact: Counterparty
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const update = useUpdateCounterparty()
  const [kind, setKind] = useState<CounterpartyKind>(contact.kind)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setKind(contact.kind)
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.contacts_rename_title()}</DialogTitle>
          <DialogDescription>{m.contacts_rename_description()}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            update.mutate(
              { id: contact.id, json: { name: String(form.get('name')), kind } },
              {
                onSuccess: () => {
                  onOpenChange(false)
                  toast.success(m.toast_contact_updated())
                },
              },
            )
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="rename-contact-name">{m.label_name()}</FieldLabel>
              <Input id="rename-contact-name" name="name" defaultValue={contact.name} required maxLength={80} autoFocus />
            </Field>
            <Field>
              <div className="flex items-center gap-3">
                <span className="label-mono text-muted-foreground">{m.label_kind()}</span>
                <ToggleGroup
                  type="single"
                  aria-label={m.label_kind()}
                  value={kind}
                  onValueChange={(value) => setKind(value as CounterpartyKind)}
                >
                  <ToggleGroupItem value="person">{m.label_person()}</ToggleGroupItem>
                  <ToggleGroupItem value="business">{m.label_business()}</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </Field>
            <FieldError>{update.error?.message}</FieldError>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                {m.action_cancel()}
              </Button>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending && <Spinner data-icon="inline-start" />}
                {m.action_save()}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Deleting is safe: the movements stay and only lose the name. */
function DeleteContactDialog({
  contact,
  open,
  onOpenChange,
}: {
  contact: Counterparty
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const remove = useDeleteCounterparty()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{m.contacts_delete_title()}</AlertDialogTitle>
          <AlertDialogDescription>{m.contacts_delete_description()}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{m.action_cancel()}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={remove.isPending}
            onClick={(event) => {
              // Keep the dialog open while the request runs, and let its error show inside it.
              event.preventDefault()
              remove.mutate(contact.id, {
                onSuccess: () => {
                  onOpenChange(false)
                  toast.success(m.toast_contact_deleted())
                },
              })
            }}
          >
            {remove.isPending && <Spinner data-icon="inline-start" />}
            {m.action_delete()}
          </AlertDialogAction>
        </AlertDialogFooter>
        <FieldError>{remove.error?.message}</FieldError>
      </AlertDialogContent>
    </AlertDialog>
  )
}
