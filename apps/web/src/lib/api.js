// One JSON transport for public and authenticated JanSeva endpoints.
export const apiBaseUrl = (import.meta.env?.VITE_API_BASE_URL?.trim() || 'http://127.0.0.1:8000').replace(/\/+$/, '').replace(/\/api$/, '')
const unauthorizedListeners = new Set()

export class ApiError extends Error {
  constructor(message, status = 0, code = 'API_ERROR') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export function onUnauthorized(listener) {
  unauthorizedListeners.add(listener)
  return () => unauthorizedListeners.delete(listener)
}

async function request(path, accessToken, options = {}) {
  if (!path.startsWith('/') || path.startsWith('//')) throw new ApiError('Invalid API path.', 0, 'INVALID_PATH')
  const { body, headers, signal, timeoutMs = path === '/schemes/ask' ? 100000 : 15000, ...rest } = options
  const method = (rest.method || 'GET').toUpperCase()
  if (!['GET', 'POST', 'PATCH'].includes(method)) throw new ApiError('Unsupported API method.', 0, 'INVALID_METHOD')
  const controller = new AbortController()
  const cancel = () => controller.abort()
  let timedOut = false
  if (signal?.aborted) cancel()
  signal?.addEventListener('abort', cancel, { once: true })
  const timer = setTimeout(() => { timedOut = true; cancel() }, timeoutMs)
  try {
    const response = await fetch(`${apiBaseUrl}/api${path}`, {
      ...rest, method, signal: controller.signal,
      headers: { Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers, ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
    })
    if (response.status === 204) return null
    const raw = await response.text()
    let data
    try { data = raw ? JSON.parse(raw) : null } catch { data = undefined }
    if (!response.ok) {
      const detail = data?.detail
      const message = response.status === 401 ? 'Your session expired. Please sign in again.'
        : typeof detail?.message === 'string' ? detail.message
        : typeof detail === 'string' ? detail
        : Array.isArray(detail) ? 'Some values are invalid. Check the form and try again.'
        : `The API request failed (${response.status}). Please retry.`
      if (response.status === 401 && accessToken) {
        // Pass the failed token only to in-memory listeners so an old request
        // cannot sign out a newly authenticated account. Never replay writes.
        for (const listener of unauthorizedListeners) { try { listener(accessToken) } catch { /* Preserve the HTTP error even if a subscriber fails. */ } }
      }
      throw new ApiError(message, response.status, typeof detail?.code === 'string' ? detail.code : 'HTTP_ERROR')
    }
    if (data === undefined || data === null) throw new ApiError('The API returned an invalid JSON response. Please retry.', response.status, 'INVALID_RESPONSE')
    return data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (controller.signal.aborted) throw new ApiError(timedOut ? 'The request timed out. Please retry.' : 'The request was cancelled.', 0, timedOut ? 'REQUEST_TIMEOUT' : 'REQUEST_CANCELLED')
    throw new ApiError('Cannot reach the API. Check your connection and try again.', 0, 'NETWORK_ERROR')
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', cancel)
  }
}

export function getHealth(options) { return request('/health', null, options) }
export function publicApiRequest(path, options) { return request(path, null, options) }
export function apiRequest(path, accessToken, options) {
  if (!accessToken) return Promise.reject(new ApiError('Please sign in to manage complaints.', 401, 'AUTH_REQUIRED'))
  return request(path, accessToken, options)
}
