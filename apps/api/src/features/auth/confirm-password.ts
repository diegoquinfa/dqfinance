/** Better Auth's own default is 8; the server keeps the number here so the rule is explicit. */
export const MIN_PASSWORD_LENGTH = 8

/** What is wrong with the repeated password. */
export type PasswordConfirmProblem = 'missing' | 'mismatch' | 'too_short'

/**
 * Checks the password the user typed twice. Returns null when the pair is fine.
 * A missing password is left to Better Auth, which reports it as invalid input.
 */
export function confirmPasswordProblem(
  password: unknown,
  confirmPassword: unknown,
): PasswordConfirmProblem | null {
  if (typeof password !== 'string') return null
  if (typeof confirmPassword !== 'string' || confirmPassword.length === 0) return 'missing'
  if (password !== confirmPassword) return 'mismatch'
  if (password.length < MIN_PASSWORD_LENGTH) return 'too_short'
  return null
}
