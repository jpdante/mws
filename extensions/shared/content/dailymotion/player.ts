import { COMPLETION_THRESHOLD } from '../../constants'

/** Minimum seconds of progress change before reporting an update. */
const THROTTLE_SECONDS = 2

/** Storage key written by the www.dailymotion.com content script. */
const DM_CURRENT_URL_KEY = 'mws_dm_url'

export interface PlayerState {
  url:             string
  title:           string
  progressSeconds: number
  durationSeconds: number
  isCompleted:     boolean
}

export type PlayerCallback = (state: PlayerState) => void

let attachedVideo: HTMLVideoElement | null = null
let lastReportedTime = -1

/**
 * URL resolved from chrome.storage (written by the main page content script).
 * Fallback for when document.referrer is stripped to origin-only by referrer policy.
 */
let cachedUrl: string | null = null

async function initUrl(): Promise<void> {
  // 1. Try document.referrer — works when the page uses a permissive referrer policy
  const ref = document.referrer
  console.debug('[MWS/DM player] document.referrer =', ref || '(empty)')
  if (ref) {
    try {
      const u = new URL(ref)
      if (
        (u.hostname === 'www.dailymotion.com' || u.hostname === 'dailymotion.com') &&
        u.pathname.startsWith('/video/')
      ) {
        cachedUrl = `${u.origin}${u.pathname}`
        console.debug('[MWS/DM player] URL from referrer:', cachedUrl)
        return
      }
    } catch { /* ignore */ }
  }

  // 2. Fall back to chrome.storage.local written by the www.dailymotion.com content script
  try {
    const result = await chrome.storage.local.get(DM_CURRENT_URL_KEY)
    cachedUrl = (result[DM_CURRENT_URL_KEY] as string | undefined) ?? null
    console.debug('[MWS/DM player] URL from storage:', cachedUrl ?? '(not set yet)')
  } catch (err) {
    console.debug('[MWS/DM player] storage read failed:', err)
  }
}

/** Keep cachedUrl up to date if the main page writes a new URL after we've already loaded. */
function watchStorageForUrl(): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !(DM_CURRENT_URL_KEY in changes)) return
    const newUrl = (changes[DM_CURRENT_URL_KEY].newValue as string | undefined) ?? null
    console.debug('[MWS/DM player] storage URL updated:', newUrl)
    cachedUrl = newUrl
  })
}

function getTitle(): string {
  return document.title.replace(/^dailymotion\s*video\s*player\s*[-–]?\s*/i, '').trim() ||
    document.title
}

function attachListeners(video: HTMLVideoElement, callback: PlayerCallback): void {
  attachedVideo    = video
  lastReportedTime = -1
  console.debug('[MWS/DM player] attached to video element', video)

  video.addEventListener('timeupdate', () => {
    if (!cachedUrl) return
    if (!video.duration || video.duration <= 0) return
    if (Math.abs(video.currentTime - lastReportedTime) < THROTTLE_SECONDS) return

    lastReportedTime = video.currentTime

    callback({
      url:             cachedUrl,
      title:           getTitle(),
      progressSeconds: video.currentTime,
      durationSeconds: video.duration,
      isCompleted:     video.currentTime / video.duration >= COMPLETION_THRESHOLD,
    })
  })
}

export async function initPlayer(callback: PlayerCallback): Promise<void> {
  console.debug('[MWS/DM player] initPlayer — location:', location.href)

  watchStorageForUrl()
  await initUrl()

  const video = document.querySelector<HTMLVideoElement>('video#video')
  console.debug('[MWS/DM player] video#video found:', video)

  if (video) {
    attachListeners(video, callback)
    return
  }

  // Dailymotion injects the video element asynchronously
  const observer = new MutationObserver(() => {
    const v = document.querySelector<HTMLVideoElement>('video#video')
    if (!v || v === attachedVideo) return
    observer.disconnect()
    console.debug('[MWS/DM player] video#video found via MutationObserver')
    attachListeners(v, callback)
  })
  observer.observe(document.body, { childList: true, subtree: true })
}
