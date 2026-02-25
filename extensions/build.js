/**
 * Build script for both Chrome (MV3) and Firefox (MV3) extensions.
 * Uses esbuild for fast TypeScript bundling.
 *
 * Usage:
 *   node build.js          — one-shot build
 *   node build.js --watch  — rebuild on file changes (dev mode)
 */

import * as esbuild from 'esbuild'
import { copyFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const isWatch = process.argv.includes('--watch')

/** Each entry point: source → output path (relative to outdir) */
const entries = [
  { in: 'shared/background/service-worker.ts', out: 'background/service-worker' },
  { in: 'shared/content/youtube/index.ts',     out: 'content/youtube/index'     },
  { in: 'shared/popup/index.ts',               out: 'popup/index'               },
]

const ICONS = ['icon16.png', 'icon48.png', 'icon128.png']

/** Prepare output directory structure and copy static assets. */
async function prepare(outdir) {
  await mkdir(`${outdir}/background`,      { recursive: true })
  await mkdir(`${outdir}/content/youtube`, { recursive: true })
  await mkdir(`${outdir}/popup`,           { recursive: true })
  await mkdir(`${outdir}/icons`,           { recursive: true })
  await copyFile('shared/popup/index.html', `${outdir}/popup/index.html`)
  await Promise.all(ICONS.map(f => copyFile(`shared/icons/${f}`, `${outdir}/icons/${f}`)))
}

/** Build (or watch) for a given browser target. */
function buildOptions(outdir, target) {
  return {
    entryPoints: entries.map(({ in: src, out }) => ({ in: src, out })),
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target,
    outdir,
    sourcemap: isWatch ? 'inline' : false,
    // Keep output readable in dev; minify in prod builds
    minify: !isWatch,
  }
}

await Promise.all([prepare('chrome'), prepare('firefox')])

if (isWatch) {
  const [ctxChrome, ctxFirefox] = await Promise.all([
    esbuild.context(buildOptions('chrome', 'chrome120')),
    esbuild.context(buildOptions('firefox', 'firefox128')),
  ])
  await Promise.all([ctxChrome.watch(), ctxFirefox.watch()])
  console.log('Watching for changes…  (Ctrl+C to stop)')
} else {
  await Promise.all([
    esbuild.build(buildOptions('chrome', 'chrome120')),
    esbuild.build(buildOptions('firefox', 'firefox128')),
  ])
  console.log('Build complete!')
}
