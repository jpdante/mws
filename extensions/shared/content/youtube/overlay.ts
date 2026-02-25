/**
 * Renders a subtle "seen up to here" marker on top of YouTube's native progress bar.
 * Sits at z-index 49 (just below the native bar at 50) so it doesn't block interaction.
 */

const BAR_ID = 'mws-seen-bar'

export function renderSeenBar(progressSeconds: number, durationSeconds: number): void {
  if (!durationSeconds || durationSeconds <= 0) return

  removeSeenBar()

  const container = document.querySelector<HTMLElement>('.ytp-progress-bar-container')
  if (!container) return

  // Ensure container is relatively positioned for absolute child
  if (!container.style.position) container.style.position = 'relative'

  const pct = Math.min(100, (progressSeconds / durationSeconds) * 100)

  const bar       = document.createElement('div')
  bar.id          = BAR_ID
  bar.style.cssText = `
    position: absolute;
    top: 0; left: 0;
    width: ${pct.toFixed(3)}%;
    height: 100%;
    background: rgba(255, 255, 255, 0.25);
    pointer-events: none;
    z-index: 49;
  `
  container.appendChild(bar)
}

export function removeSeenBar(): void {
  document.getElementById(BAR_ID)?.remove()
}
