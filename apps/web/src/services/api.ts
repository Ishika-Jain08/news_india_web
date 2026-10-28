const base = import.meta.env.VITE_API_BASE_URL || '/api/v1'

let csrfToken: string | null = null

export function setCsrfToken(token: string | null) {
  csrfToken = token
}

export function fileUrl(path: string) {
  return `${base}${path}`
}

export class ApiError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const method = (options.method ?? 'GET').toUpperCase()
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (!['GET', 'HEAD'].includes(method) && csrfToken) headers.set('X-CSRF-Token', csrfToken)
  const response = await fetch(`${base}${path}`, { ...options, headers, credentials: 'include' })
  if (response.status === 204) return undefined as T
  const payload = (await response.json().catch(() => null)) as { success?: boolean; error?: { code?: string; message?: string; details?: unknown } } | null
  if (!response.ok) {
    throw new ApiError(response.status, payload?.error?.code ?? 'REQUEST_FAILED', payload?.error?.message ?? 'Request failed', payload?.error?.details)
  }
  return payload as T
}
