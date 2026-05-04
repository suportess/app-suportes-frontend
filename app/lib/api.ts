/**
 * Cliente HTTP server-side para o app-suportes-backend.
 * Use apenas em Server Components e Server Actions (não roda no browser).
 */

import type { ApiResponse } from './types'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8031/api'

type Opts = { auth0Sub?: string; cache?: RequestCache }

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts: Opts = {},
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (opts.auth0Sub) headers['X-Auth0-Sub'] = opts.auth0Sub

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
    cache: opts.cache ?? 'no-store',
  })

  if (!res.ok) {
    let msg = `Erro ${res.status}`
    try { msg = ((await res.json()) as ApiResponse<unknown>).mensagem ?? msg } catch { /* noop */ }
    throw new Error(msg)
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return { dados: undefined } as ApiResponse<T>
  }

  return res.json() as Promise<ApiResponse<T>>
}

export const api = {
  get:    <T>(path: string, opts?: Opts) => request<T>('GET',    path, undefined, opts),
  post:   <T>(path: string, body: unknown, opts?: Opts) => request<T>('POST',   path, body, opts),
  put:    <T>(path: string, body: unknown, opts?: Opts) => request<T>('PUT',    path, body, opts),
  delete: <T>(path: string, opts?: Opts) => request<T>('DELETE', path, undefined, opts),
}
