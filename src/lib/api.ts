import { getAccessToken } from './supabase'

/**
 * Typed fetch to our own Bun API.
 *
 * Attaches the Supabase JWT on every call; the server verifies it against the
 * auth server before spending quota or tokens.
 */

export class ApiError extends Error {
  // Explicit field + assignment rather than a `readonly status` parameter
  // property: the tsconfig sets erasableSyntaxOnly, so TS syntax that emits
  // runtime code is rejected.
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken()
  if (!token) throw new ApiError('Not signed in.', 401)

  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    // 502/503/504 with no JSON body of ours = the Bun API isn't answering.
    // In dev that almost always means it wasn't started. Say so plainly rather
    // than surfacing a bare "Request failed (502)".
    if (!body.error && [502, 503, 504].includes(res.status)) {
      throw new ApiError(
        'Cannot reach the API server on :3001. Start it with `bun run dev` (runs web + api together).',
        res.status,
      )
    }
    throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status)
  }
  return res.json() as Promise<T>
}
