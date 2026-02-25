import { COMPLETION_THRESHOLD } from '../../constants'

/** YouTube fires this event on every SPA navigation. */
const YT_NAVIGATE_EVENT = 'yt-navigate-finish'

/** Minimum seconds of progress change before we report an update. Reduces noise. */
const THROTTLE_SECONDS = 2

export interface PlayerState {
  url: string
  title: string
  progressSeconds: number
  durationSeconds: number
  isCompleted: boolean
}

export type PlayerCallback = (state: PlayerState) => void

let attachedVideo: HTMLVideoElement | null = null
let lastReportedTime = -1

function getCanonicalUrl(): string {
  const v = new URLSearchParams(location.search).get('v')
  return v ? `https://www.youtube.com/watch?v=${v}` : location.href
}

function getTitle(): string {
  return (
    document.querySelector<HTMLElement>(
      'ytd-video-primary-info-renderer h1 yt-formatted-string',
    )?.textContent?.trim() ??
    document.querySelector<HTMLElement>(
      'ytd-video-primary-info-renderer h1',
    )?.textContent?.trim() ??
    document.title.replace(/ - YouTube$/, '').trim()
  )
}

function attachListeners(video: HTMLVideoElement, callback: PlayerCallback): void {
  attachedVideo  = video
  lastReportedTime = -1

  video.addEventListener('timeupdate', () => {
    if (!video.duration || video.duration <= 0) return
    if (Math.abs(video.currentTime - lastReportedTime) < THROTTLE_SECONDS) return

    lastReportedTime = video.currentTime

    callback({
      url:             getCanonicalUrl(),
      title:           getTitle(),
      progressSeconds: video.currentTime,
      durationSeconds: video.duration,
      isCompleted:     video.currentTime / video.duration >= COMPLETION_THRESHOLD,
    })
  })
}

function findAndAttach(callback: PlayerCallback): void {
  const el = document.querySelector<HTMLVideoElement>('video')
  if (!el || el === attachedVideo) return
  attachListeners(el, callback)
}

export function initPlayer(callback: PlayerCallback): void {
  findAndAttach(callback)

  // SPA navigation — YouTube swaps the video element after navigation
  window.addEventListener(YT_NAVIGATE_EVENT, () => {
    attachedVideo = null
    // Give YouTube ~1.2s to mount the new video element
    setTimeout(() => findAndAttach(callback), 1200)
  })

  // Fallback: observe for cases where yt-navigate-finish doesn't fire
  const observer = new MutationObserver(() => findAndAttach(callback))
  observer.observe(document.body, { childList: true, subtree: true })
}
