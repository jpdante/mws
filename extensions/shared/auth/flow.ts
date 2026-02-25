import { KEYCLOAK_CLIENT_ID, KEYCLOAK_ENDPOINTS } from '../constants'
import { getTokens, setTokens, clearTokens, isExpiringSoon, AuthTokens } from './tokens'
import { generateCodeVerifier, generateCodeChallenge } from './pkce'

/**
 * Opens the Keycloak login page via chrome.identity.launchWebAuthFlow (PKCE).
 * The redirect URI is chrome.identity.getRedirectURL(), which must be registered
 * in Keycloak as an allowed redirect URI.
 *
 * Keycloak setup:
 *   - Add "https://*.chromiumapp.org/*" and "https://*.extensions.allizom.org/*"
 *     as Valid Redirect URIs on the mws-ext client.
 *   - Request "offline_access" scope to receive a long-lived refresh token.
 */
export async function login(): Promise<{ ok: boolean; error?: string }> {
  try {
    const redirectUrl = chrome.identity.getRedirectURL()

    const verifier  = generateCodeVerifier()
    const challenge = await generateCodeChallenge(verifier)

    const authUrl = new URL(KEYCLOAK_ENDPOINTS.auth)
    authUrl.searchParams.set('response_type',         'code')
    authUrl.searchParams.set('client_id',             KEYCLOAK_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri',          redirectUrl)
    authUrl.searchParams.set('scope',                 'openid profile email offline_access')
    authUrl.searchParams.set('code_challenge',        challenge)
    authUrl.searchParams.set('code_challenge_method', 'S256')

    const resultUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: true,
    })

    if (!resultUrl) throw new Error('Auth flow was cancelled.')

    const redirected = new URL(resultUrl)

    // Keycloak signals errors (e.g. unverified email) via query params
    const kcError = redirected.searchParams.get('error')
    if (kcError) {
      const desc = redirected.searchParams.get('error_description') ?? ''
      if (desc.toLowerCase().includes('not fully set up') || desc.toLowerCase().includes('verify')) {
        throw new Error('Please verify your email address before signing in.')
      }
      throw new Error(desc || 'Login failed.')
    }

    const code = redirected.searchParams.get('code')
    if (!code) throw new Error('No authorization code in redirect.')

    const tokenRes = await fetch(KEYCLOAK_ENDPOINTS.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        client_id:     KEYCLOAK_CLIENT_ID,
        code,
        redirect_uri:  redirectUrl,
        code_verifier: verifier,
      }),
    })

    if (!tokenRes.ok) throw new Error(`Token exchange failed (${tokenRes.status}).`)

    const data = await tokenRes.json()
    await setTokens({
      accessToken:  data.access_token,
      refreshToken: data.refresh_token,
      expiresAt:    Date.now() + data.expires_in * 1000,
    })

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Login failed.' }
  }
}

export async function logout(): Promise<void> {
  const tokens = await getTokens()

  if (tokens) {
    // Best-effort session revocation — don't throw if it fails
    try {
      await fetch(KEYCLOAK_ENDPOINTS.logout, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id:     KEYCLOAK_CLIENT_ID,
          refresh_token: tokens.refreshToken,
        }),
      })
    } catch { /* ignore */ }
  }

  await clearTokens()
}

/**
 * Returns a valid access token, refreshing it silently if needed.
 * Returns null if the user is not logged in or refresh fails.
 */
export async function getValidAccessToken(): Promise<string | null> {
  let tokens = await getTokens()
  if (!tokens) return null

  if (isExpiringSoon(tokens)) {
    tokens = await refreshTokens(tokens)
  }

  return tokens?.accessToken ?? null
}

async function refreshTokens(tokens: AuthTokens): Promise<AuthTokens | null> {
  try {
    const res = await fetch(KEYCLOAK_ENDPOINTS.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        client_id:     KEYCLOAK_CLIENT_ID,
        refresh_token: tokens.refreshToken,
      }),
    })

    if (!res.ok) {
      await clearTokens() // refresh token expired or revoked
      return null
    }

    const data = await res.json()
    const next: AuthTokens = {
      accessToken:  data.access_token,
      refreshToken: data.refresh_token ?? tokens.refreshToken,
      expiresAt:    Date.now() + data.expires_in * 1000,
    }
    await setTokens(next)
    return next
  } catch {
    return null
  }
}
