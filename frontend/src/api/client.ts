const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || ''

let onUnauthorized: (() => void) | null = null

/** Called once from auth store so expired/invalid tokens clear the session. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  token?: string | null
  form?: boolean
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: string | { msg?: string }[] }
    if (typeof data.detail === 'string') return data.detail
    if (Array.isArray(data.detail) && data.detail[0]?.msg) return data.detail[0].msg
  } catch {
    /* ignore */
  }
  return response.statusText || 'Request failed'
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`)
  }

  let body: BodyInit | undefined
  if (options.form && options.body instanceof URLSearchParams) {
    headers.set('Content-Type', 'application/x-www-form-urlencoded')
    body = options.body
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(options.body)
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body,
  })

  if (!response.ok) {
    if (response.status === 401 && options.token) {
      onUnauthorized?.()
    }
    throw new ApiError(response.status, await parseError(response))
  }


  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export async function apiUpload<T>(
  path: string,
  file: File,
  token?: string | null,
  fieldName = 'file',
): Promise<T> {
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const body = new FormData()
  body.append(fieldName, file)

  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body,
  })

  if (!response.ok) {
    if (response.status === 401 && token) {
      onUnauthorized?.()
    }
    throw new ApiError(response.status, await parseError(response))
  }

  return (await response.json()) as T
}

export function apiDownloadUrl(path: string) {
  return `${API_URL}${path}`
}
