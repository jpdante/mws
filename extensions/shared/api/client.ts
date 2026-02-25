import { API_BASE } from '../constants'
import { getValidAccessToken } from '../auth/flow'
import { ProgressEntry, VideoProgress } from '../types'

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getValidAccessToken()
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })
}

/** Send a batch of progress entries to the API (max 50 per call). */
export async function bulkSync(entries: ProgressEntry[]): Promise<void> {
  const res = await apiFetch('/progress/bulk', {
    method: 'POST',
    body: JSON.stringify({ entries }),
  })
  if (!res.ok) throw new Error(`Bulk sync failed: ${res.status}`)
}

/** Query watched state for a list of URLs. Returns only URLs with progress. */
export async function queryProgress(urls: string[]): Promise<VideoProgress[]> {
  const res = await apiFetch('/progress/query', {
    method: 'POST',
    body: JSON.stringify({ urls }),
  })
  if (!res.ok) return []
  return res.json()
}

/** Create a new account via the API (which proxies to Keycloak Admin). */
export async function register(
  username: string,
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    })
    if (res.status === 409) return { ok: false, error: 'Username or email already exists.' }
    if (!res.ok)            return { ok: false, error: `Registration failed (${res.status}).` }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Network error — check your connection.' }
  }
}

/**
 * Sends a password-reset email via the backend (which calls Keycloak Admin API).
 * Always resolves ok:true — the API never reveals whether the email is registered.
 */
export async function forgotPassword(email: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (!res.ok) return { ok: false, error: `Request failed (${res.status}).` }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Network error — check your connection.' }
  }
}
