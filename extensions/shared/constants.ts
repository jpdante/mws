export const API_BASE = 'https://localhost:7215/api/v1'

export const KEYCLOAK_CLIENT_ID = 'mws-ext'

const KC_OIDC = 'https://auth.tryhosting.com.br/realms/mws/protocol/openid-connect'
export const KEYCLOAK_ENDPOINTS = {
  auth:   `${KC_OIDC}/auth`,
  token:  `${KC_OIDC}/token`,
  logout: `${KC_OIDC}/logout`,
}

/**
 * Fraction of video duration that counts as "completed".
 * 95% matches YouTube's own internal watched metric and is the widely accepted threshold.
 */
export const COMPLETION_THRESHOLD = 0.95

/** chrome.storage.sync key for user-configurable extension settings. */
export const SETTINGS_KEY = 'mws_settings'

/** chrome.storage.local key for the offline sync queue. */
export const QUEUE_KEY = 'mws_queue'
