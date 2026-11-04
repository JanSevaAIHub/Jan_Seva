const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://127.0.0.1:8000'

export async function getHealth(): Promise<{ status: string }> {
  const response = await fetch(`${apiBaseUrl}/api/health`)
  if (!response.ok) throw new Error(`API health check failed (${response.status})`)
  return response.json() as Promise<{ status: string }>
}

export { apiBaseUrl }
