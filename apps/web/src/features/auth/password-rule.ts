import * as m from '@dqfinance/i18n/messages'

/** The same rule the server checks: at least 8 characters, and the password typed twice. */
export const MIN_PASSWORD_LENGTH = 8

/** What is wrong with the pair of passwords. */
export type PasswordProblem = 'missing' | 'mismatch' | 'too_short'

/**
 * Checks the password and its repeat. Undefined when the pair is fine.
 * The server checks the same rule, so the form can say it before the round trip.
 */
export function passwordProblem(password: string, confirmPassword: string): PasswordProblem | undefined {
  if (!confirmPassword) return 'missing'
  if (password !== confirmPassword) return 'mismatch'
  if (password.length < MIN_PASSWORD_LENGTH) return 'too_short'
  return undefined
}

/** The message for each problem, in the user's language. */
export function passwordProblemMessage(problem: PasswordProblem): string {
  if (problem === 'missing') return m.auth_password_confirm_missing()
  if (problem === 'mismatch') return m.auth_password_confirm_mismatch()
  return m.auth_password_too_short({ min: MIN_PASSWORD_LENGTH })
}
