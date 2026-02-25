import { initPlayer, PlayerState } from './player'
import { renderSeenBar }           from './overlay'
import { initThumbnailObserver }   from './thumbnails'

let lastQueriedUrl = ''

function onPlayerUpdate(state: PlayerState): void {
  // When navigating to a new video, fetch previously stored progress to show the overlay
  if (state.url !== lastQueriedUrl) {
    lastQueriedUrl = state.url

    chrome.runtime.sendMessage(
      { type: 'QUERY_PROGRESS', urls: [state.url] },
      (res) => {
        const stored = res?.progress?.[0]
        if (stored?.progressSeconds > 0 && stored.durationSeconds) {
          renderSeenBar(stored.progressSeconds, stored.durationSeconds)
        }
      },
    )
  }

  // Buffer the current position in the background queue
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

initPlayer(onPlayerUpdate)
initThumbnailObserver()
