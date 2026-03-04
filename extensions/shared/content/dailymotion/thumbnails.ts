import { VideoProgress } from '../../types'
import { SETTINGS_KEY }  from '../../constants'
import { t }             from '../../i18n'

const MARKED_ATTR   = 'data-mws'
const QUERIED_ATTR  = 'data-mws-queried'
const OVERLAY_CLASS = 'mws-dm-overlay'
const STYLES_ID     = 'mws-dm-styles'
const DEFAULT_COLOR = '#3b82f6'

/** Selector for Dailymotion video card containers.
 *  - Home/feed cards use `data-channel` on the outer wrapper
 *  - Channel/search cards use `data-testid="video-card"` instead */
const CARD_SEL = 'div[data-channel], div[data-testid="video-card"]'

function injectStyles(): void {
  if (document.getElementById(STYLES_ID)) return

  const style = document.createElement('style')
  style.id = STYLES_ID
  style.textContent = `
    :root { --mws-dm-bar-color: ${DEFAULT_COLOR}; }

    /* The anchor is already position:absolute (fills the FixedRatioDiv).
       Only add overflow:hidden to clip the ribbon — don't touch position. */
    [data-mws] a[aria-hidden="true"][href^="/video/"] { overflow: hidden !important; }

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
    .mws-dm-overlay-bg { position: absolute; inset: 0; }
    [data-mws="complete"] .mws-dm-overlay-bg { background: rgba(0, 0, 0, 0.38); }
    [data-mws="partial"]  .mws-dm-overlay-bg { background: rgba(0, 0, 0, 0.15); }

    /* Diagonal ribbons — top-right corner */
    .mws-dm-watched-ribbon,
    .mws-dm-seen-ribbon {
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
    .mws-dm-watched-ribbon { background: rgba(0, 0, 0, 0.72); }
    .mws-dm-seen-ribbon     { background: var(--mws-dm-bar-color); opacity: 0.88; }

    /* Progress bar at the bottom edge */
    .mws-dm-progress-track {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: rgba(255, 255, 255, 0.18);
      z-index: 6;
    }
    .mws-dm-progress-fill {
      height: 100%;
      background: var(--mws-dm-bar-color);
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
  document.documentElement.style.setProperty('--mws-dm-bar-color', color)
}

function extractVideoUrl(card: Element): string | null {
  // href is relative ("/video/xa17sxu") in HTML; a.href returns the absolute URL
  const a = card.querySelector<HTMLAnchorElement>('a[aria-hidden="true"][href^="/video/"]')
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
  bg.className = 'mws-dm-overlay-bg'
  overlay.appendChild(bg)

  const pct = p.durationSeconds && p.durationSeconds > 0
    ? Math.min(100, (p.progressSeconds / p.durationSeconds) * 100)
    : p.isCompleted ? 100 : 0

  if (p.isCompleted) {
    const ribbon = document.createElement('div')
    ribbon.className = 'mws-dm-watched-ribbon'
    ribbon.textContent = t.ribbonWatched
    overlay.appendChild(ribbon)
  } else if (pct > 0) {
    const ribbon = document.createElement('div')
    ribbon.className = 'mws-dm-seen-ribbon'
    ribbon.textContent = t.ribbonSeen
    overlay.appendChild(ribbon)
  }

  if (pct > 0) {
    const track = document.createElement('div')
    track.className = 'mws-dm-progress-track'
    const fill = document.createElement('div')
    fill.className = 'mws-dm-progress-fill'
    fill.style.width = `${pct.toFixed(2)}%`
    track.appendChild(fill)
    overlay.appendChild(track)
  }

  return overlay
}

async function markVisibleThumbnails(): Promise<void> {
  const allCards = document.querySelectorAll(CARD_SEL)
  if (allCards.length === 0) return

  const newCards = [...allCards].filter(el => !el.hasAttribute(QUERIED_ATTR))
  if (newCards.length === 0) return

  const urlToCards = new Map<string, Element[]>()
  newCards.forEach(el => {
    const url = extractVideoUrl(el)
    if (!url) return
    const list = urlToCards.get(url)
    if (list) list.push(el)
    else urlToCards.set(url, [el])
  })

  // Stamp before async call so concurrent runs don't double-query
  newCards.forEach(el => el.setAttribute(QUERIED_ATTR, ''))
  if (urlToCards.size === 0) return

  let progress: VideoProgress[] = []
  try {
    const res = await chrome.runtime.sendMessage({
      type: 'QUERY_PROGRESS',
      urls: [...urlToCards.keys()],
    })
    progress = (res?.progress as VideoProgress[]) ?? []
  } catch {
    // SW not ready — remove stamps so these cards retry next scroll
    newCards.forEach(el => el.removeAttribute(QUERIED_ATTR))
    return
  }

  const progressMap = new Map(progress.map(p => [p.url, p]))

  for (const [url, cards] of urlToCards) {
    const p = progressMap.get(url)

    for (const card of cards) {
      const thumbAnchor = card.querySelector<Element>('a[aria-hidden="true"][href^="/video/"]')

      if (!p) {
        card.removeAttribute(MARKED_ATTR)
        thumbAnchor?.querySelector(`.${OVERLAY_CLASS}`)?.remove()
        continue
      }

      card.setAttribute(MARKED_ATTR, p.isCompleted ? 'complete' : 'partial')

      if (!thumbAnchor) continue

      thumbAnchor.querySelector(`.${OVERLAY_CLASS}`)?.remove()
      thumbAnchor.appendChild(buildOverlay(p))
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
    const hasNewCards = mutations.some(m =>
      [...m.addedNodes].some(n =>
        n instanceof Element && (
          n.matches(CARD_SEL) ||
          n.querySelector(CARD_SEL) !== null
        )
      )
    )
    if (!hasNewCards) return
    clearTimeout(debounce)
    debounce = setTimeout(markVisibleThumbnails, 300)
  })
  observer.observe(document.body, { childList: true, subtree: true })
}
