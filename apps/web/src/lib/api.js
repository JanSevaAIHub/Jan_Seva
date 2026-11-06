const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

export async function getHealth() {
  const response = await fetch(`${apiBaseUrl}/api/health`)
  if (!response.ok) throw new Error(`API health check failed (${response.status})`)
  return response.json()
}

export { apiBaseUrl }

export async function publicApiRequest(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}/api${path}`, {
    ...options, headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.detail?.message || `Scheme service failed (${response.status}). Please retry.`)
  return data
}

export async function apiRequest(path, accessToken, options = {}) {
  if (!accessToken) throw new Error('Please sign in to manage complaints.')
  const response = await fetch(`${apiBaseUrl}/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers, Authorization: `Bearer ${accessToken}` },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(data?.detail?.message || (response.status === 401
      ? 'Your session expired. Please sign in again.' : `Request failed (${response.status}).`))
    error.status = response.status
    throw error
  }
  return data
}
