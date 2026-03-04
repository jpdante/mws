import { initThumbnailObserver } from './thumbnails'

/** Must match DM_CURRENT_URL_KEY in player.ts */
const DM_CURRENT_URL_KEY = 'mws_dm_url'

let lastSyncedPath = ''

function syncUrl(trigger: string): void {
  const path = location.pathname
  if (path === lastSyncedPath) return          // avoid redundant writes
  lastSyncedPath = path

  if (path.startsWith('/video/')) {
    const url = `https://www.dailymotion.com${path}`
    console.debug(`[MWS/DM] syncUrl (${trigger}):`, url)
    chrome.storage.local.set({ [DM_CURRENT_URL_KEY]: url })
  } else {
    console.debug(`[MWS/DM] syncUrl (${trigger}): not a video page, path =`, path)
  }
}

// 1. Initial page load
syncUrl('init')

// 2. Navigation API — fires reliably for all SPA navigations in content scripts
//    (Chrome 102+, Firefox 126+ — both above our targets of Chrome 120, Firefox 128)
if ('navigation' in window) {
  ;(window as Window & { navigation: EventTarget }).navigation
    .addEventListener('navigate', () => {
      // URL hasn't updated yet at 'navigate' time; defer one tick
      setTimeout(() => syncUrl('navigation-api'), 0)
    })
  console.debug('[MWS/DM] using Navigation API for SPA detection')
} else {
  // 3. Fallback: title MutationObserver — title changes on every SPA navigation
  console.debug('[MWS/DM] Navigation API unavailable, falling back to title observer')
  const titleEl = document.querySelector('title')
  if (titleEl) {
    new MutationObserver(() => syncUrl('title-observer'))
      .observe(titleEl, { subtree: true, characterData: true, childList: true })
  }
  // 4. popstate fires for back/forward (doesn't fire for pushState, but covers that case)
  window.addEventListener('popstate', () => syncUrl('popstate'))
}

initThumbnailObserver()
