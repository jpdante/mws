import { VideoProgress } from '../../types'
import { SETTINGS_KEY }  from '../../constants'
import { t }             from '../../i18n'

const MARKED_ATTR  = 'data-mws'
const QUERIED_ATTR = 'data-mws-queried'
const OVERLAY_CLASS = 'mws-xh-overlay'
const STYLES_ID     = 'mws-xh-styles'
const DEFAULT_COLOR = '#3b82f6'

/** Selector for xHamster video thumbnail cards. */
const THUMB_SEL = 'div.video-thumb[data-video-id]'

function injectStyles(): void {
  if (document.getElementById(STYLES_ID)) return

  const style = document.createElement('style')
  style.id = STYLES_ID
  style.textContent = `
    :root { --mws-xh-bar-color: ${DEFAULT_COLOR}; }

    /* Image container needs to be the positioning context for the overlay */
    [data-mws] a.video-thumb__image-container { position: relative !important; overflow: hidden !important; }

    /* Full-thumbnail overlay */
    .${OVERLAY_CLASS} {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 5;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Dark transparent background tint */
    .mws-xh-overlay-bg { position: absolute; inset: 0; }
    [data-mws="complete"] .mws-xh-overlay-bg { background: rgba(0, 0, 0, 0.38); }
    [data-mws="partial"]  .mws-xh-overlay-bg { background: rgba(0, 0, 0, 0.15); }

    /* Diagonal ribbons — top-right corner */
    .mws-xh-watched-ribbon,
    .mws-xh-seen-ribbon {
      position: absolute;
      top: 14px;
      right: -20px;
      width: 88px;
      padding: 4px 0;
      color: rgba(255, 255, 255, 0.95);
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-align: center;
      text-transform: uppercase;
      transform: rotate(45deg);
      pointer-events: none;
      z-index: 7;
    }
    .mws-xh-watched-ribbon { background: rgba(0, 0, 0, 0.72); }
    .mws-xh-seen-ribbon     { background: var(--mws-xh-bar-color); opacity: 0.88; }

    /* Progress bar at the bottom edge */
    .mws-xh-progress-track {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: rgba(255, 255, 255, 0.18);
      z-index: 6;
    }
    .mws-xh-progress-fill {
      height: 100%;
      background: var(--mws-xh-bar-color);
    }
  `
  document.head.appendChild(style)
}

async function getProgressBarColor(): Promise<string> {
  try {
    const result = await chrome.storage.sync.get(SETTINGS_KEY)
    return (result[SETTINGS_KEY] as { progressBarColor?: string } | undefined)
      ?.progressBarColor ?? DEFAULT_COLOR
  } catch {
    return DEFAULT_COLOR
  }
}

function applyProgressBarColor(color: string): void {
  document.documentElement.style.setProperty('--mws-xh-bar-color', color)
}

function extractVideoUrl(thumb: Element): string | null {
  const a = thumb.querySelector<HTMLAnchorElement>('a[data-role="thumb-link"]')
  if (!a?.href) return null
  try {
    const u = new URL(a.href)
    return `${u.origin}${u.pathname}`
  } catch {
    return null
  }
}

function buildOverlay(p: VideoProgress): HTMLDivElement {
  const overlay = document.createElement('div')
  overlay.className = OVERLAY_CLASS

  const bg = document.createElement('div')
  bg.className = 'mws-xh-overlay-bg'
  overlay.appendChild(bg)

  const pct = p.durationSeconds && p.durationSeconds > 0
    ? Math.min(100, (p.progressSeconds / p.durationSeconds) * 100)
    : p.isCompleted ? 100 : 0

  if (p.isCompleted) {
    const ribbon = document.createElement('div')
    ribbon.className = 'mws-xh-watched-ribbon'
    ribbon.textContent = t.ribbonWatched
    overlay.appendChild(ribbon)
  } else if (pct > 0) {
    const ribbon = document.createElement('div')
    ribbon.className = 'mws-xh-seen-ribbon'
    ribbon.textContent = t.ribbonSeen
    overlay.appendChild(ribbon)
  }

  if (pct > 0) {
    const track = document.createElement('div')
    track.className = 'mws-xh-progress-track'
    const fill = document.createElement('div')
    fill.className = 'mws-xh-progress-fill'
    fill.style.width = `${pct.toFixed(2)}%`
    track.appendChild(fill)
    overlay.appendChild(track)
  }

  return overlay
}

async function markVisibleThumbnails(): Promise<void> {
  const allThumbs = document.querySelectorAll(THUMB_SEL)
  if (allThumbs.length === 0) return

  const newThumbs = [...allThumbs].filter(el => !el.hasAttribute(QUERIED_ATTR))
  if (newThumbs.length === 0) return

  const urlToThumbs = new Map<string, Element[]>()
  newThumbs.forEach(el => {
    const url = extractVideoUrl(el)
    if (!url) return
    const list = urlToThumbs.get(url)
    if (list) list.push(el)
    else urlToThumbs.set(url, [el])
  })

  // Stamp before async call so concurrent runs don't double-query
  newThumbs.forEach(el => el.setAttribute(QUERIED_ATTR, ''))
  if (urlToThumbs.size === 0) return

  let progress: VideoProgress[] = []
  try {
    const res = await chrome.runtime.sendMessage({
      type: 'QUERY_PROGRESS',
      urls: [...urlToThumbs.keys()],
    })
    progress = (res?.progress as VideoProgress[]) ?? []
  } catch {
    // SW not ready — remove stamps so these thumbnails retry next scroll
    newThumbs.forEach(el => el.removeAttribute(QUERIED_ATTR))
    return
  }

  const progressMap = new Map(progress.map(p => [p.url, p]))

  for (const [url, els] of urlToThumbs) {
    const p = progressMap.get(url)

    for (const thumb of els) {
      const container = thumb.querySelector<Element>('a.video-thumb__image-container')

      if (!p) {
        thumb.removeAttribute(MARKED_ATTR)
        container?.querySelector(`.${OVERLAY_CLASS}`)?.remove()
        continue
      }

      thumb.setAttribute(MARKED_ATTR, p.isCompleted ? 'complete' : 'partial')

      if (!container) continue

      container.querySelector(`.${OVERLAY_CLASS}`)?.remove()
      container.appendChild(buildOverlay(p))
    }
  }
}

export function initThumbnailObserver(): void {
  injectStyles()
  getProgressBarColor().then(applyProgressBarColor)

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return
    const newColor = (changes[SETTINGS_KEY]?.newValue as { progressBarColor?: string } | undefined)
      ?.progressBarColor
    if (newColor) applyProgressBarColor(newColor)
  })

  markVisibleThumbnails()

  let debounce: ReturnType<typeof setTimeout>
  const observer = new MutationObserver((mutations) => {
    const hasNewThumbs = mutations.some(m =>
      [...m.addedNodes].some(n =>
        n instanceof Element && (
          n.matches(THUMB_SEL) ||
          n.querySelector(THUMB_SEL) !== null
        )
      )
    )
    if (!hasNewThumbs) return
    clearTimeout(debounce)
    debounce = setTimeout(markVisibleThumbnails, 300)
  })
  observer.observe(document.body, { childList: true, subtree: true })
}
