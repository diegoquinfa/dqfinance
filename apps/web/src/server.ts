import api from '@dqfinance/api'
import { paraglideMiddleware } from '@dqfinance/i18n/server'
import handler from '@tanstack/react-start/server-entry'

// Paths apps/api owns; everything else is the web app. Same origin, so the session cookie is first-party.
const isApiPath = (path: string) => path.startsWith('/api/') || path.startsWith('/.well-known/') || path === '/mcp'

export default {
  // Typed from Hono's fetch: apps/web has DOM types, not the Workers globals.
  fetch(...args: Parameters<typeof api.fetch>) {
    const [request] = args
    // The middleware reads the locale cookie and holds it for the request, so the server
    // renders the same language the browser asks for. Without it the server falls back to
    // the base locale and the page that the server sent does not match the one the client
    // renders (React's hydration error 418).
    return paraglideMiddleware(request, () =>
      isApiPath(new URL(request.url).pathname) ? api.fetch(...args) : handler.fetch(request),
    )
  },
}
