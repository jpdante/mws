# MyWatchState Extension — Build Instructions

Cross-website video watch-progress tracker for Chrome and Firefox (Manifest V3).
All source lives in `shared/` and is compiled by `build.js` (esbuild) into the `chrome/` and `firefox/` output directories.

---

## Requirements

| Tool | Version | Install |
|---|---|---|
| **Node.js** | 22 (LTS) | https://nodejs.org |

No other global tools are required. esbuild and TypeScript are installed locally as dev dependencies.

---

## Build steps

```bash
# 1. Enter the extensions directory
cd extensions

# 2. Install dependencies
npm install

# 3. Build both targets (Chrome + Firefox)
npm run build
```

After the build completes:
- `chrome/`  — load as an unpacked extension in Chrome / Chromium
- `firefox/` — load as a temporary add-on in Firefox (`about:debugging`)

> **Alternative package managers:** pnpm (`pnpm install && pnpm build`) and yarn (`yarn && yarn build`) also work.

### Development (watch mode)

```bash
npm run dev
```

Rebuilds on every file change with inline source maps and no minification.

### Type-checking (optional)

esbuild skips type-checking for speed. To run the TypeScript compiler:

```bash
npx tsc --noEmit
```

---

## What the build script does

`build.js` uses **esbuild** to bundle six TypeScript entry points into each browser directory:

| Source | Output |
|---|---|
| `shared/background/service-worker.ts` | `{browser}/background/service-worker.js` |
| `shared/content/youtube/index.ts` | `{browser}/content/youtube/index.js` |
| `shared/content/xhamster/index.ts` | `{browser}/content/xhamster/index.js` |
| `shared/content/dailymotion/index.ts` | `{browser}/content/dailymotion/index.js` |
| `shared/content/dailymotion/player-frame.ts` | `{browser}/content/dailymotion/player-frame.js` |
| `shared/popup/index.ts` | `{browser}/popup/index.js` |

Static files (`shared/popup/index.html`, `shared/icons/*.png`) are copied as-is.
The manifests (`chrome/manifest.json`, `firefox/manifest.json`) are not generated — they are static source files checked into the repository.

---

## Source layout

```
extensions/
├── shared/               # All TypeScript source (browser-agnostic)
│   ├── types.ts
│   ├── constants.ts
│   ├── i18n.ts
│   ├── auth/             # PKCE flow, token storage
│   ├── api/              # API client (bulkSync, queryProgress, …)
│   ├── background/       # MV3 service worker
│   ├── content/
│   │   ├── youtube/      # Player hook + thumbnail overlay
│   │   ├── xhamster/     # Player hook + thumbnail overlay
│   │   └── dailymotion/  # Player hook (iframe) + thumbnail overlay
│   └── popup/            # Extension popup (HTML + TS)
├── chrome/
│   ├── manifest.json     # MV3 Chrome manifest (static, not generated)
│   └── icons/
├── firefox/
│   ├── manifest.json     # MV3 Firefox manifest (static, not generated)
│   └── icons/
├── build.js              # esbuild build script
├── package.json
├── pnpm-lock.yaml
└── tsconfig.json
```
