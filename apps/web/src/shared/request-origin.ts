import { createServerFn } from '@tanstack/react-start'
import { getRequestUrl } from '@tanstack/react-start/server'

/**
 * The origin of the request.
 *
 * The Open Graph image has to be an absolute URL, because a crawler reads the tags and never
 * resolves a relative one. The call lives in a server function so the request is read on the
 * server and the client bundle never carries it.
 */
export const requestOrigin = createServerFn({ method: 'GET' }).handler(() => getRequestUrl().origin)
