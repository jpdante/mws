import { initPlayer, PlayerState } from './player'

function onPlayerUpdate(state: PlayerState): void {
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

// Only initialise when we can resolve a canonical dailymotion.com video URL
// (i.e. we're embedded on a dailymotion.com video page, not some arbitrary embed).
initPlayer(onPlayerUpdate)
