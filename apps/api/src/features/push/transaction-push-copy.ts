import * as m from '@dqfinance/i18n/messages'
import type { Locale } from '../../shared/locale'

export function transactionPushCopy(type: 'income' | 'expense', locale: Locale) {
  const title = type === 'income' ? m.push_income_title({}, { locale }) : m.push_expense_title({}, { locale })
  return { title, body: m.push_expense_body({}, { locale }) }
}
