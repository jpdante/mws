import { VideoProgress } from "../../types";
import { SETTINGS_KEY } from "../../constants";
import { t } from "../../i18n";

const MARKED_ATTR = "data-mws";
const QUERIED_ATTR = "data-mws-queried"; // set after first query; prevents redundant API calls
const OVERLAY_CLASS = "mws-overlay";
const STYLES_ID = "mws-styles";
const DEFAULT_COLOR = "#3b82f6";

/**
 * Selector for the thumbnail anchor in YouTube's current view-model markup.
 * Replaces the legacy "a#thumbnail" which no longer exists.
 */
const THUMB_LINK_SEL = "a.yt-lockup-view-model__content-image";

/** YouTube thumbnail renderer tag names to scan (lowercase for fast Set lookup). */
const RENDERER_TAG_NAMES = new Set([
  "ytd-video-renderer",
  "ytd-grid-video-renderer",
  "ytd-rich-item-renderer",
  "ytd-compact-video-renderer",
]);
const RENDERER_SELECTORS =
  [...RENDERER_TAG_NAMES].join(", ") +
  ", yt-lockup-view-model.ytd-item-section-renderer";

function injectStyles(): void {
  if (document.getElementById(STYLES_ID)) return;

  const style = document.createElement("style");
  style.id = STYLES_ID;
  style.textContent = `
    :root { --mws-bar-color: ${DEFAULT_COLOR}; }

    /* yt-thumbnail-view-model is sized exactly to the image — overlay lives here */
    [data-mws] yt-thumbnail-view-model { position: relative !important; overflow: hidden; display: block; }

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

    /* Dark transparent background */
    .mws-overlay-bg {
      position: absolute;
      inset: 0;
    }
    [data-mws="complete"] .mws-overlay-bg { background: rgba(0, 0, 0, 0.38); }
    [data-mws="partial"]  .mws-overlay-bg { background: rgba(0, 0, 0, 0.15); }

    /* Diagonal ribbons — top-right corner, clipped by parent overflow:hidden */
    .mws-watched-ribbon,
    .mws-seen-ribbon {
      position: absolute;
      top: 14px;
      right: -20px;
      width: 78px;
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
    .mws-watched-ribbon { background: rgba(0, 0, 0, 0.72); }
    .mws-seen-ribbon     { background: var(--mws-bar-color); opacity: 0.88; }

    /* Progress bar at the bottom edge */
    .mws-progress-track {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: rgba(255, 255, 255, 0.18);
      z-index: 6;
    }
    .mws-progress-fill {
      height: 100%;
      background: var(--mws-bar-color);
    }
  `;
  document.head.appendChild(style);
}

async function getProgressBarColor(): Promise<string> {
  try {
    const result = await chrome.storage.sync.get(SETTINGS_KEY);
    return (
      (result[SETTINGS_KEY] as { progressBarColor?: string } | undefined)
        ?.progressBarColor ?? DEFAULT_COLOR
    );
  } catch {
    return DEFAULT_COLOR;
  }
}

function applyProgressBarColor(color: string): void {
  document.documentElement.style.setProperty("--mws-bar-color", color);
}

function findThumbnailAnchor(renderer: Element): HTMLAnchorElement | null {
  // Primary: light DOM — covers div.yt-lockup-view-model (compact) and
  // yt-lockup-view-model when it projects children via light DOM (rich grid).
  const light = renderer.querySelector<HTMLAnchorElement>(THUMB_LINK_SEL);
  if (light) return light;

  // Fallback: yt-lockup-view-model may render via shadow DOM on some builds.
  const lockup = renderer.querySelector("yt-lockup-view-model");
  if (lockup?.shadowRoot) {
    const inShadow = lockup.shadowRoot.querySelector<HTMLAnchorElement>(THUMB_LINK_SEL);
    if (inShadow) return inShadow;
  }

  return null;
}

function extractVideoUrl(renderer: Element): string | null {
  const a = findThumbnailAnchor(renderer);
  if (!a?.href) return null;
  const match = a.href.match(/[?&]v=([\w-]+)/);
  return match ? `https://www.youtube.com/watch?v=${match[1]}` : null;
}

function buildOverlay(p: VideoProgress): HTMLDivElement {
  const overlay = document.createElement("div");
  overlay.className = OVERLAY_CLASS;

  const bg = document.createElement("div");
  bg.className = "mws-overlay-bg";
  overlay.appendChild(bg);

  const pct =
    p.durationSeconds && p.durationSeconds > 0
      ? Math.min(100, (p.progressSeconds / p.durationSeconds) * 100)
      : p.isCompleted
        ? 100
        : 0;

  if (p.isCompleted) {
    const ribbon = document.createElement("div");
    ribbon.className = "mws-watched-ribbon";
    ribbon.textContent = t.ribbonWatched;
    overlay.appendChild(ribbon);
  } else if (pct > 0) {
    const ribbon = document.createElement("div");
    ribbon.className = "mws-seen-ribbon";
    ribbon.textContent = t.ribbonSeen;
    overlay.appendChild(ribbon);
  }

  if (pct > 0) {
    const track = document.createElement("div");
    track.className = "mws-progress-track";
    const fill = document.createElement("div");
    fill.className = "mws-progress-fill";
    fill.style.width = `${pct.toFixed(2)}%`;
    track.appendChild(fill);
    overlay.appendChild(track);
  }

  return overlay;
}

async function markVisibleThumbnails(): Promise<void> {
  const allRenderers = document.querySelectorAll(RENDERER_SELECTORS);
  if (allRenderers.length === 0) return;

  // Skip renderers already queried — only process new ones added since the last run
  const newRenderers = [...allRenderers].filter(
    (r) => !r.hasAttribute(QUERIED_ATTR),
  );
  if (newRenderers.length === 0) return;

  console.debug(`[MWS] Querying ${newRenderers.length} new renderers.`);

  // Group by URL (a video can appear more than once on the page)
  const urlToRenderers = new Map<string, Element[]>();
  newRenderers.forEach((el) => {
    const url = extractVideoUrl(el);
    if (!url) return;
    const list = urlToRenderers.get(url);
    if (list) list.push(el);
    else urlToRenderers.set(url, [el]);
  });

  // Stamp all new renderers before the async call so concurrent runs don't
  // double-query them. We remove the stamp on failure so they retry next time.
  newRenderers.forEach((r) => r.setAttribute(QUERIED_ATTR, ""));

  if (urlToRenderers.size === 0) return;

  console.debug(
    `[MWS] Extracted ${urlToRenderers.size} unique URLs. Examples:`,
    [...urlToRenderers.keys()].slice(0, 5),
  );

  let progress: VideoProgress[] = [];
  try {
    const res = await chrome.runtime.sendMessage({
      type: "QUERY_PROGRESS",
      urls: [...urlToRenderers.keys()],
    });
    progress = (res?.progress as VideoProgress[]) ?? [];
  } catch (err) {
    // SW not ready — remove stamps so these renderers are retried next scroll
    newRenderers.forEach((r) => r.removeAttribute(QUERIED_ATTR));
    console.warn("[MWS] Failed to query progress, will retry.", err);
    return;
  }

  const progressMap = new Map(progress.map((p) => [p.url, p]));

  for (const [url, els] of urlToRenderers) {
    const p = progressMap.get(url);

    for (const renderer of els) {
      const thumbAnchor = findThumbnailAnchor(renderer);

      // The overlay goes inside yt-thumbnail-view-model, which is sized exactly
      // to the thumbnail image. Appending to the <a> parent breaks the layout.
      const thumbViewModel = thumbAnchor?.querySelector("yt-thumbnail-view-model") ?? null;

      if (!p) {
        renderer.removeAttribute(MARKED_ATTR);
        thumbViewModel?.querySelector(`.${OVERLAY_CLASS}`)?.remove();
        continue;
      }

      renderer.setAttribute(MARKED_ATTR, p.isCompleted ? "complete" : "partial");

      if (!thumbViewModel) continue;

      thumbViewModel.querySelector(`.${OVERLAY_CLASS}`)?.remove();
      thumbViewModel.appendChild(buildOverlay(p));
    }
  }
}

/**
 * Returns true when a MutationRecord contains newly added renderer elements
 * (either directly or as descendants). Used to skip irrelevant DOM noise.
 */
function mutationsHaveNewRenderers(mutations: MutationRecord[]): boolean {
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (!(node instanceof Element)) continue;
      const tag = node.tagName.toLowerCase();
      // Direct match (e.g. YouTube appends the renderer itself)
      if (RENDERER_TAG_NAMES.has(tag)) return true;
      // History page: yt-lockup-view-model.ytd-item-section-renderer
      if (tag === "yt-lockup-view-model" && node.classList.contains("ytd-item-section-renderer")) return true;
      // Renderer added inside a container (e.g. wrapped in a section)
      if (node.querySelector(RENDERER_SELECTORS) !== null) return true;
    }
  }
  return false;
}

export function initThumbnailObserver(): void {
  injectStyles();

  getProgressBarColor().then(applyProgressBarColor);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    const newColor = (
      changes[SETTINGS_KEY]?.newValue as
        | { progressBarColor?: string }
        | undefined
    )?.progressBarColor;
    if (newColor) applyProgressBarColor(newColor);
  });

  markVisibleThumbnails();

  let debounce: ReturnType<typeof setTimeout>;
  const observer = new MutationObserver((mutations) => {
    // Only reschedule when actual renderer elements are added to the DOM.
    // Ignoring all other mutations prevents YouTube's constant DOM noise
    // (player ticks, ad loading, etc.) from resetting the debounce indefinitely.
    if (!mutationsHaveNewRenderers(mutations)) return;
    clearTimeout(debounce);
    debounce = setTimeout(markVisibleThumbnails, 300);
    console.debug("[MWS] Detected new thumbnails, scheduling update...");
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
