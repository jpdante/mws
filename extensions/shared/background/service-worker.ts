/**
 * Background service worker — the single source of truth for auth, sync, and queue.
 *
 * MV3 important rules applied here:
 *   - All event listeners registered synchronously at top level so they survive
 *     service worker restarts.
 *   - All persistent state lives in chrome.storage.local (SW memory is ephemeral).
 */

import { login, logout, reAuthenticate, getValidAccessToken } from '../auth/flow'
import { bulkSync, queryProgress, register, forgotPassword, deleteAccount } from '../api/client'
import { BgMessage, ProgressEntry } from '../types'
import { QUEUE_KEY } from '../constants'

const SYNC_ALARM = 'mws_sync'

// ── Event listeners (must be top-level / synchronous) ────────────────────────

chrome.runtime.onInstalled.addListener(ensureAlarm)
chrome.runtime.onStartup.addListener(ensureAlarm)

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM) flushQueue()
})

chrome.runtime.onMessage.addListener((msg: BgMessage, _sender, sendResponse) => {
  handleMessage(msg).then(sendResponse).catch((err) =>
    sendResponse({ ok: false, error: String(err) }),
  )
  return true // keep message channel open for async response
})

// ── Alarm ─────────────────────────────────────────────────────────────────────

function ensureAlarm(): void {
  chrome.alarms.get(SYNC_ALARM, (existing) => {
    if (!existing) {
      chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 1 })
    }
  })
}

// ── Message dispatch ──────────────────────────────────────────────────────────

async function handleMessage(msg: BgMessage): Promise<unknown> {
  switch (msg.type) {
    case 'LOGIN':
      return login()

    case 'LOGOUT':
      await logout()
      return { ok: true }

    case 'REGISTER':
      return register(msg.username, msg.email, msg.password)

    case 'FORGOT_PASSWORD':
      return forgotPassword(msg.email)

    case 'GET_STATUS': {
      const token = await getValidAccessToken()
      if (!token) return { isLoggedIn: false }
      try {
        // Decode JWT payload for display — server re-validates on every API call
        const payload = JSON.parse(atob(token.split('.')[1]))
        return {
          isLoggedIn: true,
          username:   payload.preferred_username as string | undefined,
          email:      payload.email             as string | undefined,
        }
      } catch {
        return { isLoggedIn: true }
      }
    }

    case 'PROGRESS_UPDATE':
      await enqueue(msg.entry)
      return { ok: true }

    case 'QUERY_PROGRESS': {
      const token = await getValidAccessToken()
      if (!token) return { progress: [] }
      const progress = await queryProgress(msg.urls).catch(() => [])
      return { progress }
    }

    case 'DELETE_ACCOUNT': {
      // Force the user to re-enter credentials; the resulting token's auth_time
      // is checked server-side to authorize the destructive operation.
      const reauth = await reAuthenticate()
      if (!reauth.ok) return reauth

      const result = await deleteAccount()
      if (result.ok) {
        await chrome.storage.local.remove(QUEUE_KEY)
        await logout()
      }
      return result
    }

    case 'TRIGGER_SYNC':
      await flushQueue()
      return { ok: true }

    default:
      return { ok: false, error: 'Unknown message type.' }
  }
}

// ── Queue management ──────────────────────────────────────────────────────────

async function getQueue(): Promise<ProgressEntry[]> {
  const result = await chrome.storage.local.get(QUEUE_KEY)
  return (result[QUEUE_KEY] as ProgressEntry[]) ?? []
}

/**
 * Add or update an entry in the offline queue.
 * Progress only ever moves forward — stale updates from other tabs are ignored.
 */
async function enqueue(entry: ProgressEntry): Promise<void> {
  const queue = await getQueue()
  const idx   = queue.findIndex(e => e.url === entry.url)

  if (idx >= 0) {
    if (entry.progressSeconds >= queue[idx].progressSeconds) {
      queue[idx] = entry
    }
  } else {
    queue.push(entry)
  }

  await chrome.storage.local.set({ [QUEUE_KEY]: queue })
}

/**
 * Flush the queue to the API in batches of 50.
 * On failure the queue is preserved and retried on the next alarm.
 */
async function flushQueue(): Promise<void> {
  const queue = await getQueue()
  if (queue.length === 0) return

  const token = await getValidAccessToken()
  if (!token) return // not authenticated — hold entries

  try {
    for (let i = 0; i < queue.length; i += 50) {
      await bulkSync(queue.slice(i, i + 50))
    }
    await chrome.storage.local.set({ [QUEUE_KEY]: [] })
  } catch (err) {
    console.error('[MWS] Sync failed, will retry on next alarm:', err)
  }
}
