import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'

// Real gameplay capture: Chrome's own screencast (JPEG frames of the page, GPU-rendered in a visible window) piped
// into the ffmpeg that ships with Remotion, timed by arrival, written as a constant 30 fps H.264 clip.
const FFMPEG = fileURLToPath(new URL('../../node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe', import.meta.url))
export const RECORDINGS = fileURLToPath(new URL('../../assets/recordings/', import.meta.url))
mkdirSync(RECORDINGS, { recursive: true })

export async function record(page: Page, name: string, fn: () => Promise<unknown>) {
  const out = `${RECORDINGS}${name}.mp4`
  const ff = spawn(FFMPEG, [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'image2pipe', '-use_wallclock_as_timestamps', '1', '-c:v', 'mjpeg', '-i', '-',
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p', '-r', '30', '-fps_mode', 'cfr',
    '-c:v', 'libx264', '-crf', '15', '-preset', 'fast', out,
  ])
  const done = new Promise<void>((resolve, reject) => ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code} for ${name}`)))))
  ff.stderr.on('data', (d) => process.stderr.write(`[ffmpeg ${name}] ${d}`))
  const cdp = await page.context().newCDPSession(page)
  // Chrome only sends a frame when the page changes, so a still ending (a Victory screen) would be cut off: the last
  // frame is written again when the shot stops, which timestamps it at the real end.
  let last: Buffer | null = null
  cdp.on('Page.screencastFrame', ({ data, sessionId }) => {
    last = Buffer.from(data, 'base64')
    ff.stdin.write(last)
    void cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => undefined)
  })
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 1920 })
  try {
    await fn()
  } finally {
    await cdp.send('Page.stopScreencast').catch(() => undefined)
    await cdp.detach().catch(() => undefined)
    if (last) ff.stdin.write(last)
    ff.stdin.end()
    await done
    console.log(`recorded ${name}`)
  }
}

/** Records, but a failure in one shot is logged instead of ending the whole session. */
export async function shot(page: Page, name: string, fn: () => Promise<unknown>) {
  try {
    await record(page, name, fn)
  } catch (e) {
    console.warn(`SHOT FAILED ${name}: ${(e as Error).message.split('\n')[0]}`)
  }
}
