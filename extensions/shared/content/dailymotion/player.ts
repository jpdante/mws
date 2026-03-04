import { COMPLETION_THRESHOLD } from '../../constants'

/** Minimum seconds of progress change before reporting an update. */
const THROTTLE_SECONDS = 2

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
 * Returns the canonical Dailymotion video URL by inspecting document.referrer
 * (which, inside the iframe, is the parent page URL).
 */
function getCanonicalUrl(): string | null {
  try {
    const ref = document.referrer
    if (!ref) return null
    const u = new URL(ref)
    if (
      (u.hostname === 'www.dailymotion.com' || u.hostname === 'dailymotion.com') &&
      u.pathname.startsWith('/video/')
    ) {
      return `${u.origin}${u.pathname}`
    }
    return null
  } catch {
    return null
  }
}

function getTitle(): string {
  // The iframe's document.title may contain the video title after the " - " separator.
  return document.title.replace(/^dailymotion\s*video\s*player\s*[-–]?\s*/i, '').trim() ||
    document.title
}

function attachListeners(video: HTMLVideoElement, callback: PlayerCallback): void {
  attachedVideo    = video
  lastReportedTime = -1

  video.addEventListener('timeupdate', () => {
    const url = getCanonicalUrl()
    if (!url) return
    if (!video.duration || video.duration <= 0) return
    if (Math.abs(video.currentTime - lastReportedTime) < THROTTLE_SECONDS) return

    lastReportedTime = video.currentTime

    callback({
      url,
      title:           getTitle(),
      progressSeconds: video.currentTime,
      durationSeconds: video.duration,
      isCompleted:     video.currentTime / video.duration >= COMPLETION_THRESHOLD,
    })
  })
}

export function initPlayer(callback: PlayerCallback): void {
  const video = document.querySelector<HTMLVideoElement>('video#video')
  if (video) {
    attachListeners(video, callback)
    return
  }

  // Dailymotion injects the video element asynchronously
  const observer = new MutationObserver(() => {
    const v = document.querySelector<HTMLVideoElement>('video#video')
    if (!v || v === attachedVideo) return
    observer.disconnect()
    attachListeners(v, callback)
  })
  observer.observe(document.body, { childList: true, subtree: true })
}
