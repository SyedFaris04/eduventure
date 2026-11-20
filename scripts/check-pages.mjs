// Serves pages/ under /eduventure/ the way GitHub Pages does (a missing file gets the site's root 404.html, never one in a
// subfolder) and checks
// the download page, the game, a cold deep link and an unknown game path in Chromium. Run after npm run build:pages.
import { createServer } from 'node:http'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { chromium } from 'playwright'

const ROOT = 'pages'
const PREFIX = '/eduventure'
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp',
  '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.svg': 'image/svg+xml' }

const server = createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (!url.startsWith(PREFIX)) return res.writeHead(404).end()
  let file = normalize(join(ROOT, url.slice(PREFIX.length)))
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
  if (existsSync(file)) return res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file))
  res.writeHead(404, { 'content-type': 'text/html' }).end(readFileSync(join(ROOT, '404.html')))
})
await new Promise((r) => server.listen(5180, r))
const base = 'http://localhost:5180'

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage()
const missing = []
page.on('response', (r) => r.status() === 404 && r.url().includes('/assets/') && missing.push(r.url()))
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
const fail = (msg) => {
  console.error('pages check failed:', msg)
  process.exitCode = 1
}
try {
  // The website: both buttons, the language switch, a demo answer and the QR code.
  const APK = 'https://github.com/SyedFaris04/eduventure/releases/latest/download/eduventure.apk'
  await page.goto(`${base}/eduventure/`)
  await page.evaluate(() => localStorage.removeItem('eduventure.site.lang'))
  await page.reload()
  const play = page.getByRole('link', { name: 'Play in your browser' }).first()
  if (!(await play.isVisible())) fail('website has no play link')
  if ((await play.getAttribute('href')) !== 'play/') fail('the play link does not go to the game')
  const apk = page.getByRole('link', { name: 'Download for Android' }).first()
  if (!(await apk.isVisible()) || (await apk.getAttribute('href')) !== APK) fail('website has no working APK link')
  await page.getByRole('button', { name: /Bahasa Melayu|BM/ }).click()
  if (!(await page.getByRole('link', { name: 'Muat turun untuk Android' }).first().isVisible())) fail('the language switch did not change the page to Malay')
  await page.getByRole('button', { name: /English|EN/ }).click()
  await page.getByRole('button', { name: /Sunlight/ }).click()
  if (!(await page.getByText('Right! The Sproutling takes a hit.').isVisible())) fail('the demo question did not answer')
  // On a phone, a vertical swipe over the 3D island scrolls the page (only sideways drags spin it).
  const phone = await browser.newPage({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true })
  await phone.goto(`${base}/eduventure/`)
  await phone.locator('canvas').first().waitFor({ timeout: 30_000 }).catch(() => {})
  const touch = await phone.evaluate(() => [...document.querySelectorAll('canvas')].map((c) => getComputedStyle(c).touchAction))
  if (touch.length === 0) fail('the 3D island did not load')
  if (touch.some((t) => !t.includes('pan-y'))) fail(`a vertical swipe over the 3D island does not scroll the page (touch-action: ${touch.join(', ')})`)
  await phone.close()

  // The backs of the flip cards fit inside the cards, in both languages, at tablet and laptop widths.
  for (const width of [320, 360, 768, 1024, 1366]) for (const lang of ['en', 'ms']) {
    const tab = await browser.newPage({ viewport: { width, height: 900 } })
    await tab.goto(`${base}/eduventure/`)
    await tab.evaluate((l) => localStorage.setItem('eduventure.site.lang', l), lang)
    await tab.reload()
    const spill = await tab.evaluate(() => [...document.querySelectorAll('.flip-back')].some((b) => b.scrollHeight > b.clientHeight + 1))
    if (spill) fail(`flip-card text spills out of its card at ${width}px (${lang})`)
    await tab.close()
  }

  // No sideways scrolling on the narrowest phones, in either language.
  for (const lang of ['en', 'ms']) {
    const small = await browser.newPage({ viewport: { width: 320, height: 640 } })
    await small.goto(`${base}/eduventure/`)
    await small.evaluate((l) => localStorage.setItem('eduventure.site.lang', l), lang)
    await small.reload()
    if (await small.evaluate(() => document.documentElement.scrollWidth > innerWidth)) fail(`the website scrolls sideways on a 320px phone (${lang})`)
    await small.close()
  }
  const qrOk = await page.getByRole('img', { name: /QR code/ }).evaluate((img) => img.complete && img.naturalWidth > 0)
  if (!qrOk) fail('the QR code did not load')

  await page.goto(`${base}/eduventure/play/explore`)
  await page.getByRole('heading').first().waitFor({ timeout: 30_000 })
  if (!page.url().endsWith('/eduventure/play/explore')) fail(`deep link moved to ${page.url()}`)
  if (!(await page.getByText(/Greenhaven/i).first().isVisible())) fail('deep link to Explore did not show the islands')

  // Links in emails and to parents open cold on a deep path, with a query and (Supabase) tokens in the hash.
  await page.goto(`${base}/eduventure/play/parent?code=TEST-CODE#access_token=x`)
  await page.waitForTimeout(4000)
  if (!page.url().endsWith('/eduventure/play/parent?code=TEST-CODE#access_token=x')) fail(`parent link moved to ${page.url()}`)

  await page.goto(`${base}/eduventure/elsewhere`)
  await page.waitForURL(/\/eduventure\/$/, { timeout: 15_000 }).catch(() => fail(`a path outside the game went to ${page.url()}`))

  await page.goto(`${base}/eduventure/play/no-such-page`)
  await page.getByText(/leads nowhere/i).first().waitFor({ timeout: 30_000 }).catch(() => fail('unknown path did not show the game’s Not Found page'))

  await page.goto(`${base}/eduventure/play/`)
  // The loading screen (art from /assets/) reaches 100%; "Tap to start" hands over to the welcome page.
  await page.getByRole('button', { name: /Tap to start/ }).click({ timeout: 60_000 }).catch(() => fail('the loading screen never finished'))
  await page.getByRole('button', { name: /Start Your Adventure/ }).waitFor({ timeout: 60_000 }).catch(() => fail(`the game did not start (at ${page.url()})`))
  if (!page.url().includes('/eduventure/play/welcome')) fail(`the game started at ${page.url()}`)
  await page.waitForTimeout(3000)
  if (missing.length) fail(`assets missing: ${missing.join(', ')}`)
  if (errors.length) fail(`page errors: ${errors.join(' | ')}`)
} finally {
  await browser.close()
  server.close()
}
if (!process.exitCode) console.log('pages ok')
