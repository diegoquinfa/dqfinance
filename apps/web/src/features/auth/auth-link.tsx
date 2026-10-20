import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { isOAuthFlow } from './auth-client'

/** The signed-out pages one can link to. */
export type AuthPage = '/sign-in' | '/sign-up' | '/forgot-password'

/**
 * A link to another signed-out page. The OAuth query travels with it byte for byte: the router
 * re-serializes a parsed search, and the signature of the query would not survive that.
 */
export function AuthLink({ to, children }: { to: AuthPage; children: ReactNode }) {
  const className = 'label-mono link-draw self-start text-muted-foreground hover:text-ink'
  const search = isOAuthFlow() && typeof window !== 'undefined' ? window.location.search : ''
  if (!search) {
    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    )
  }
  return (
    <a href={`${to}${search}`} className={className}>
      {children}
    </a>
  )
}
