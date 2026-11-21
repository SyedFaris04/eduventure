import { expect, test, type Page } from '@playwright/test'
import { enterWorld, newPlayer } from './helpers'

// Phones play sideways (decision #46). Everything in the world fits a 740 × 360 screen without scrolling.
test.use({ viewport: { width: 740, height: 360 }, hasTouch: true, isMobile: true })

type Store = { getState: () => { monsters: { id: string; kind: string }[] }; setState: (s: object) => void }
const set = (page: Page, s: object) => page.evaluate((st) => (window as unknown as { __game: Store }).__game.setState(st), s)

/** The open dialog lies inside the screen and needs no scrolling of its own (lists may scroll inside it). */
async function expectFits(page: Page, name: string) {
  const dialog = page.getByRole('dialog').first()
  await expect(dialog, name).toBeVisible()
  await page.waitForTimeout(600)
  const r = await dialog.evaluate((d) => {
    const b = d.getBoundingClientRect()
    return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, scroll: d.scrollHeight - d.clientHeight, page: document.documentElement.scrollHeight - innerHeight, w: innerWidth, h: innerHeight }
  })
  expect.soft(r.top, `${name}: top inside the screen`).toBeGreaterThanOrEqual(-1)
  expect.soft(r.bottom, `${name}: bottom inside the screen`).toBeLessThanOrEqual(r.h + 1)
  expect.soft(r.left, `${name}: left inside`).toBeGreaterThanOrEqual(-1)
  expect.soft(r.right, `${name}: right inside`).toBeLessThanOrEqual(r.w + 1)
  expect.soft(r.scroll, `${name}: the panel itself does not scroll`).toBeLessThanOrEqual(1)
  expect.soft(r.page, `${name}: the page does not scroll`).toBeLessThanOrEqual(1)
}

const close = (page: Page) => set(page, { battle: null, boss: null, harvest: null, workbench: false, board: false, jetty: false, dialogue: null, settings: false })

test('every world panel fits a sideways phone', async ({ page }) => {
  test.setTimeout(300_000)
  await newPlayer(page)
  await enterWorld(page)
  await page.waitForTimeout(2000)

  // The HUD, the joystick and the action button never overlap.
  const boxes = await Promise.all(
    [page.getByRole('region', { name: 'Your hero' }), page.locator('[aria-label="Movement pad"]')].map((l) => l.first().boundingBox()),
  )
  if (boxes[0] && boxes[1]) {
    const [a, b] = boxes as { x: number; y: number; width: number; height: number }[]
    const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
    expect.soft(overlap, 'hero card and joystick overlap').toBe(false)
  }

  const monster = await page.evaluate(() => (window as unknown as { __game: Store }).__game.getState().monsters[0])
  await set(page, { battle: { monsterId: monster.id, monster: monster.kind } })
  await page.getByRole('dialog').getByRole('button').nth(2).waitFor({ timeout: 30_000 })
  await expectFits(page, 'battle')
  await close(page)

  await set(page, { boss: 'guardian' })
  await expectFits(page, 'boss')
  await close(page)

  await set(page, { harvest: { x: 17, y: 6, material: 'wood' } })
  await page.waitForTimeout(2500)
  await expectFits(page, 'harvest')
  await close(page)

  await set(page, { workbench: true })
  await expectFits(page, 'workbench')
  await close(page)

  await set(page, { board: true })
  await expectFits(page, 'camp board')
  await close(page)

  await set(page, { jetty: true })
  await expectFits(page, 'boat')
  await close(page)

  await set(page, { dialogue: { npc: 'elder', page: 0 } })
  await expectFits(page, 'dialogue')
  await close(page)

  await page.getByRole('button', { name: /Settings/ }).first().click()
  await expectFits(page, 'settings')
})

/** The element is on screen without scrolling. */
async function expectInView(page: Page, name: string, locator: ReturnType<Page['getByRole']>) {
  await expect(locator.first(), name).toBeVisible({ timeout: 30_000 })
  await page.evaluate(() => window.scrollTo(0, 0))
  const box = (await locator.first().boundingBox())!
  const h = await page.evaluate(() => innerHeight)
  expect.soft(box.y, `${name}: below the top`).toBeGreaterThanOrEqual(0)
  expect.soft(box.y + box.height, `${name}: on screen without scrolling`).toBeLessThanOrEqual(h + 1)
}

test("each page's main button is on a sideways phone screen without scrolling", async ({ page, browser }) => {
  test.setTimeout(300_000)
  const out = await browser.newContext({ viewport: { width: 740, height: 360 }, hasTouch: true, isMobile: true })
  const anon = await out.newPage()
  await anon.goto('/welcome')
  await expectInView(anon, 'welcome', anon.getByRole('button', { name: /Start Your Adventure/ }))
  await anon.goto('/login')
  await expectInView(anon, 'login', anon.getByRole('button', { name: 'Log in' }))
  await out.close()

  await newPlayer(page)
  await page.goto('/home')
  await expectInView(page, 'home', page.getByRole('link', { name: /Enter the World/ }))
  await page.goto('/settings/academic')
  await expectInView(page, 'learning profile', page.getByRole('button', { name: /^Next/ }))
  await page.goto('/shop')
  await expectInView(page, 'shop', page.getByRole('button', { name: /Buy/ }))
  await page.goto('/academy')
  await expectInView(page, 'code academy', page.getByRole('link', { name: /Python Basics/ }))
  await page.goto('/hall')
  await expectInView(page, 'language hall', page.getByRole('link', { name: /English for Malaysian students/ }))
})
