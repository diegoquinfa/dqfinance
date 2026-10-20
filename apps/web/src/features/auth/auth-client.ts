import { oauthProviderClient } from '@better-auth/oauth-provider/client'
import { createAuthClient } from 'better-auth/react'
import { anonymousClient } from 'better-auth/client/plugins'

// oauthProviderClient forwards the signed OAuth query on sign-in/consent so an agent's
// authorization flow resumes automatically after the user signs in. No baseURL: the API shares this origin.
// anonymousClient adds signIn.anonymous: a guest, a user with no email the person owns.
export const authClient = createAuthClient({
  // Fail visibly instead of leaving the form waiting forever when the API is down or stuck.
  fetchOptions: { timeout: 15_000 },
  plugins: [oauthProviderClient(), anonymousClient()],
})

/** True when a query string carries an MCP client's OAuth authorization request. */
export const isOAuthSearch = (search: string) => new URLSearchParams(search).has('sig')

/** True while this page is part of an MCP client's OAuth authorization flow. */
export const isOAuthFlow = () => typeof window !== 'undefined' && isOAuthSearch(window.location.search)
