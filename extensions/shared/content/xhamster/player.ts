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

/** Strip query string and hash — the path alone is the canonical xHamster video URL. */
function getCanonicalUrl(): string {
  return `${location.origin}${location.pathname}`
}

function getTitle(): string {
  return (
    document.querySelector<HTMLElement>('h1')?.textContent?.trim() ??
    document.title.replace(/\s*[-–|].*$/, '').trim()
  )
}

function attachListeners(video: HTMLVideoElement, callback: PlayerCallback): void {
  attachedVideo    = video
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

export function initPlayer(callback: PlayerCallback): void {
  const video = document.querySelector<HTMLVideoElement>('video#xplayer__video')
  if (video) {
    attachListeners(video, callback)
    return
  }

  // xHamster injects the player asynchronously after page load
  const observer = new MutationObserver(() => {
    const v = document.querySelector<HTMLVideoElement>('video#xplayer__video')
    if (!v || v === attachedVideo) return
    observer.disconnect()
    attachListeners(v, callback)
  })
  observer.observe(document.body, { childList: true, subtree: true })
}
