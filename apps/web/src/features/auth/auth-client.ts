import { oauthProviderClient } from '@better-auth/oauth-provider/client'
import { createAuthClient } from 'better-auth/react'
import { API_URL } from '#/shared/config'

// oauthProviderClient forwards the signed OAuth query on sign-in/consent so an agent's
// authorization flow resumes automatically after the user signs in.
export const authClient = createAuthClient({
  baseURL: API_URL,
  // Fail visibly instead of leaving the form waiting forever when the API is down or stuck.
  fetchOptions: { timeout: 15_000 },
  plugins: [oauthProviderClient()],
})

/** True while this page is part of an MCP client's OAuth authorization flow. */
export const isOAuthFlow = () =>
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('sig')
