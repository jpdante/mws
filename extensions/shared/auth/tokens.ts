const TOKENS_KEY = 'auth_tokens'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  /** Unix timestamp (ms) when the access token expires. */
  expiresAt: number
}

export async function getTokens(): Promise<AuthTokens | null> {
  const result = await chrome.storage.local.get(TOKENS_KEY)
  return (result[TOKENS_KEY] as AuthTokens) ?? null
}

export async function setTokens(tokens: AuthTokens): Promise<void> {
  await chrome.storage.local.set({ [TOKENS_KEY]: tokens })
}

export async function clearTokens(): Promise<void> {
  await chrome.storage.local.remove(TOKENS_KEY)
}

/** True if the access token expires within the next 60 seconds. */
export function isExpiringSoon(tokens: AuthTokens): boolean {
  return Date.now() >= tokens.expiresAt - 60_000
}
