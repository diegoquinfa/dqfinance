import * as m from '@dqfinance/i18n/messages'
import type { Locale } from '../../shared/locale'

/** What a push announces. The web refetches its queries on any push, so the copy only says what changed. */
export type PushKind =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'transfer_received'
  | 'balance_adjustment'
  | 'import'

export function pushCopy(kind: PushKind, locale: Locale) {
  const title = {
    income: m.push_income_title,
    expense: m.push_expense_title,
    transfer: m.push_transfer_title,
    transfer_received: m.push_transfer_received_title,
    balance_adjustment: m.push_balance_adjustment_title,
    import: m.push_import_title,
  }[kind]({}, { locale })
  return { title, body: m.push_body({}, { locale }) }
}
