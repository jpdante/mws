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

console.debug('[MWS/DM player-frame] content script loaded in:', location.href)
initPlayer(onPlayerUpdate)
