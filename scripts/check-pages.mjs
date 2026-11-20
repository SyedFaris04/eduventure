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
const fail = (msg) => {
  console.error('pages check failed:', msg)
  process.exitCode = 1
}
try {
  await page.goto(`${base}/eduventure/`)
  if (!(await page.getByRole('link', { name: /Play in your browser/ }).isVisible())) fail('download page has no play link')
  if (!(await page.getByRole('link', { name: /Download the Android app/ }).isVisible())) fail('download page has no APK link')

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
} finally {
  await browser.close()
  server.close()
}
if (!process.exitCode) console.log('pages ok')
