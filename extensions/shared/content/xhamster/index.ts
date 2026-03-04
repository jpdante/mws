import { initPlayer, PlayerState } from './player'
import { initThumbnailObserver }   from './thumbnails'

let lastQueriedUrl = ''

function onPlayerUpdate(state: PlayerState): void {
  // On first update for a new URL, fetch stored progress (for potential future seen-bar)
  if (state.url !== lastQueriedUrl) {
    lastQueriedUrl = state.url
  }

  chrome.runtime.sendMessage({
    type:  'PROGRESS_UPDATE',
    entry: {
      url:             state.url,
      title:           state.title,
      progressSeconds: state.progressSeconds,
      durationSeconds: state.durationSeconds,
      isCompleted:     state.isCompleted,
    },
  })
}

// initPlayer is a no-op on non-video pages (no #xplayer__video found)
initPlayer(onPlayerUpdate)
initThumbnailObserver()
