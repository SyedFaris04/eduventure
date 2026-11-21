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

const close = (page: Page) => set(page, { battle: null, boss: null, workbench: false, board: false, jetty: false, dialogue: null, settings: false })

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

// The longest question of each hard type, so the check uses the worst case the game really shows.
import { readdirSync, readFileSync } from 'node:fs'
type Opt = { id: string; text: string }
type Src = { id: string; type: string; prompt: string; options: Opt[] | { left: Opt[]; right: Opt[] }; explanation: string; difficulty: number; subject: string }
const dir = new URL('../../content/questions/', import.meta.url)
const bank = readdirSync(dir).filter((f) => f.endsWith('.json')).flatMap((f) => (JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as { questions: Src[] }).questions)
const longest = (type: string) => bank.filter((q) => q.type === type).sort((a, b) => JSON.stringify(b.options).length + b.prompt.length - JSON.stringify(a.options).length - a.prompt.length)[0]

for (const size of [{ width: 740, height: 360 }, { width: 667, height: 320 }])
  test(`battle buttons stay on screen for every question type at ${size.width}×${size.height}`, async ({ page }) => {
    test.setTimeout(300_000)
    await page.setViewportSize(size)
    await newPlayer(page)
    await enterWorld(page)
    for (const type of ['multi_select', 'ordering', 'matching']) {
      const q = longest(type)
      // The server picks questions at random; this one is swapped in, and marked wrong with its real explanation.
      await page.route('**/rest/v1/rpc/start_encounter', async (route) => {
        const real = await (await route.fetch()).json()
        await route.fulfill({ json: { ...real, pet_guess: null, question: { id: q.id, type: q.type, prompt: q.prompt, options: q.options, unit: null, difficulty: q.difficulty, subject: q.subject, status: 'published' } } })
      })
      await page.route('**/rest/v1/rpc/answer_question', (route) =>
        route.fulfill({ json: { correct: false, correct_answer: [], explanation: q.explanation, wrong_reason: q.explanation, damage: 0, farmed: false, xp_gained: 0, gold_gained: 0, bonus: { xp: 0, gold: 0 }, totals: { xp: 0, level: 1, gold: 0 }, leveled_up: false, second_chance: false, missions_completed: [] } }),
      )
      const monster = await page.evaluate(() => (window as unknown as { __game: Store }).__game.getState().monsters[0])
      await set(page, { battle: { monsterId: monster.id, monster: monster.kind } })
      const dialog = page.getByRole('dialog')
      const answer = dialog.getByRole('button', { name: 'Answer' })
      await answer.waitFor({ timeout: 30_000 })
      await expectInView(page, `${type}: Answer`, answer)
      if (type === 'multi_select') await dialog.locator('button[aria-pressed]').first().click()
      if (type === 'matching')
        for (const select of await dialog.getByRole('combobox').all()) await select.selectOption({ index: 1 })
      await answer.click()
      const next = dialog.getByRole('button', { name: 'Continue' })
      await expectInView(page, `${type}: Continue after answering`, next)
      await expectInView(page, `${type}: Run away`, dialog.getByRole('button', { name: /Run away/ }))
      await page.unrouteAll()
      await close(page)
    }
  })
