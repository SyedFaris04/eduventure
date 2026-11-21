import { mkdirSync } from 'node:fs'
import { test, type Browser, type Page } from '@playwright/test'
import { enterWorld, newPlayer } from './helpers'

// Screenshots of every main screen at phone, tablet and laptop sizes, for the device pass (a tool, not a check).
// Run: DEVICE_SHOTS=<folder> npx playwright test device-shots --project devices
const OUT = process.env.DEVICE_SHOTS
// DEVICE_SIZES=landscape: three common sideways phones only.
const ALL_SIZES = [
  { name: 'phone', width: 360, height: 740, touch: true },
  { name: 'phone-land', width: 740, height: 360, touch: true },
  { name: 'tablet', width: 768, height: 1024, touch: true },
  { name: 'tablet-land', width: 1024, height: 768, touch: true },
  { name: 'laptop', width: 1366, height: 768, touch: false },
]
const LANDSCAPE = [
  { name: 'land-740', width: 740, height: 360, touch: true },
  { name: 'land-800', width: 800, height: 360, touch: true },
  { name: 'land-915', width: 915, height: 412, touch: true },
]
const SIZES = process.env.DEVICE_SIZES === 'landscape' ? LANDSCAPE : ALL_SIZES
const SIGNED_OUT = ['/welcome', '/login', '/signup', '/explore']
const SIGNED_IN = ['/home', '/character', '/settings/academic', '/shop', '/pet', '/library', '/academy', '/hall', '/parent', '/dev/board?place=qa_camp']

test.skip(!OUT, 'set DEVICE_SHOTS to a folder')

async function context(browser: Browser, size: (typeof SIZES)[number], state?: string) {
  return browser.newContext({ viewport: { width: size.width, height: size.height }, hasTouch: size.touch, isMobile: size.touch, storageState: state })
}
const shot = (page: Page, size: string, name: string) => page.screenshot({ path: `${OUT}/${name.replace(/[/?=]+/g, '_').replace(/^_/, '') || 'root'}-${size}.png` })

test('device shots', async ({ browser }) => {
  test.setTimeout(900_000)
  mkdirSync(OUT!, { recursive: true })

  // One guest for every size (anonymous sign-ins are limited per hour).
  const first = await browser.newContext()
  const p0 = await first.newPage()
  await newPlayer(p0, { year: '2000', name: 'Device Tester' })
  const state = `${OUT}/state.json`
  await first.storageState({ path: state })
  await first.close()

  for (const size of SIZES) {
    const out = await context(browser, size)
    const page = await out.newPage()
    for (const path of SIGNED_OUT) {
      await page.goto(path)
      await page.waitForTimeout(1500)
      await shot(page, size.name, path)
    }
    await page.goto('/')
    await page.waitForTimeout(4000)
    await shot(page, size.name, 'loading')
    await out.close()

    const ctx = await context(browser, size, state)
    const p = await ctx.newPage()
    for (const path of SIGNED_IN) {
      await p.goto(path)
      await p.waitForTimeout(2500)
      await shot(p, size.name, path)
    }
    await p.goto('/home')
    await enterWorld(p)
    await p.waitForTimeout(5000)
    await shot(p, size.name, 'world')
    await p.getByRole('button', { name: /Settings/ }).first().click()
    await p.waitForTimeout(800)
    await shot(p, size.name, 'world-settings')
    await p.keyboard.press('Escape')
    await p.evaluate(() => {
      const g = (window as unknown as { __game: { getState: () => { monsters: { id: string; kind: string }[] }; setState: (s: object) => void } }).__game
      const m = g.getState().monsters[0]
      g.setState({ settings: false, battle: { monsterId: m.id, monster: m.kind } })
    })
    await p.waitForTimeout(4000)
    await shot(p, size.name, 'world-battle')
    await ctx.close()
  }
})
