import api from '@dqfinance/api'
import handler from '@tanstack/react-start/server-entry'

// Paths apps/api owns; everything else is the web app. Same origin, so the session cookie is first-party.
const isApiPath = (path: string) => path.startsWith('/api/') || path.startsWith('/.well-known/') || path === '/mcp'

export default {
  // Typed from Hono's fetch: apps/web has DOM types, not the Workers globals.
  fetch(...args: Parameters<typeof api.fetch>) {
    const [request] = args
    return isApiPath(new URL(request.url).pathname) ? api.fetch(...args) : handler.fetch(request)
  },
}
