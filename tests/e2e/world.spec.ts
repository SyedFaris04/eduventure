import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

// The test reads answers from the content file, like a student who knows them. The app never ships this file.
type Q = { prompt: string; type: string; answer: unknown; options?: { id: string; text: string }[] }
const bank = (JSON.parse(readFileSync(new URL('../../content/questions/starter.json', import.meta.url), 'utf8')) as { questions: Q[] }).questions

type GameState = { prompt: { kind: string } | null; player: { x: number; y: number }; monsters: { kind: string; x: number; y: number }[] }
const state = (page: Page) => page.evaluate(() => (window as unknown as { __game: { getState: () => GameState } }).__game.getState())

async function newPlayer(page: Page) {
  const next = () => page.getByRole('button', { name: /^Next/ }).click()
  await page.goto('/welcome')
  await page.getByRole('button', { name: /Start Your Adventure/ }).click()
  await page.getByLabel('Year you were born').selectOption('2016')
  await next()
  await page.getByRole('button', { name: /Lower Secondary School/ }).click()
  await next()
  await page.getByRole('listbox', { name: 'Where do you study?' }).getByRole('option', { name: /Malaysia/ }).click()
  await next()
  await page.getByRole('button', { name: /International/ }).click()
  await next()
  await page.getByRole('button', { name: 'Not sure / skip' }).click()
  await next()
  await next()
  await page.getByRole('button', { name: 'Science', exact: true }).click()
  await next()
  await next()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByRole('button', { name: 'Save hero' }).click()
  await expect(page).toHaveURL(/\/home$/)
}

async function enterWorld(page: Page) {
  await page.getByRole('link', { name: /Enter the World/ }).click()
  await expect(page).toHaveURL(/\/world$/)
  await page.waitForFunction(() => ((window as unknown as { __game?: { getState: () => GameState } }).__game?.getState().player.x ?? 0) > 0, null, { timeout: 30_000 })
}

/** Clicks the map at a grid point, assuming the camera is centred on the hero. */
async function clickGrid(page: Page, target: { x: number; y: number }) {
  const s = await state(page)
  const vp = page.viewportSize()!
  const zoom = vp.width >= 900 ? 1.25 : 1
  const dx = (target.x - target.y - (s.player.x - s.player.y)) * 32 * zoom
  const dy = (target.x + target.y - (s.player.x + s.player.y)) * 16 * zoom
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
  await page.mouse.click(clamp(vp.width / 2 + dx, 20, vp.width - 20), clamp(vp.height / 2 + dy, 130, vp.height - 20))
}

async function answerCorrectly(page: Page) {
  const prompt = await page.locator('section[role=dialog] p.text-xl').innerText()
  const q = bank.find((x) => x.prompt === prompt)!
  if (q.type === 'mcq') await page.getByRole('button', { name: q.options!.find((o) => o.id === q.answer)!.text, exact: false }).first().click()
  else if (q.type === 'true_false') await page.getByRole('button', { name: q.answer === 'true' ? /True/ : /False/ }).click()
  else {
    const a = q.answer as { value?: number; accept?: string[] }
    await page.getByLabel('Your answer').fill(q.type === 'numeric' ? String(a.value) : a.accept![0])
    await page.getByRole('button', { name: 'Answer', exact: true }).click()
  }
  await expect(page.getByText(/Correct!/)).toBeVisible({ timeout: 15_000 })
}

test('walk, talk to the Elder, win a battle; Home shows the server totals after a reload', async ({ page }) => {
  test.setTimeout(240_000)
  await newPlayer(page)
  await enterWorld(page)

  const start = (await state(page)).player
  await page.keyboard.down('ArrowUp')
  await page.waitForFunction((y) => (window as unknown as { __game: { getState: () => GameState } }).__game.getState().player.y < y - 0.5, start.y, { timeout: 20_000 })
  await page.keyboard.up('ArrowUp')

  // Elder Rowan stands at tile (12, 13). The camera eases after the hero, so let it settle before tapping.
  for (let i = 0; i < 4 && (await state(page)).prompt?.kind !== 'npc'; i++) {
    await page.waitForTimeout(1500)
    await clickGrid(page, { x: 12.5, y: 13.5 })
    await page.waitForFunction(() => (window as unknown as { __game: { getState: () => GameState } }).__game.getState().prompt?.kind === 'npc', null, { timeout: 30_000 }).catch(() => undefined)
  }
  await expect(page.getByRole('button', { name: /Talk to Elder Rowan/ })).toBeVisible()
  await page.getByRole('button', { name: /Talk to Elder Rowan/ }).click()
  await expect(page.getByRole('dialog', { name: 'Elder Rowan' })).toContainText('Welcome to Greenhaven')
  for (let i = 0; i < 4; i++) await page.getByRole('dialog', { name: 'Elder Rowan' }).getByRole('button', { name: /Next|Close/ }).first().click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // Walk to the nearest Sproutling and battle it.
  for (let i = 0; i < 12 && (await state(page)).prompt?.kind !== 'monster'; i++) {
    const s = await state(page)
    const m = s.monsters.filter((x) => x.kind === 'sproutling').sort((a, b) => Math.hypot(a.x - s.player.x, a.y - s.player.y) - Math.hypot(b.x - s.player.x, b.y - s.player.y))[0]
    await clickGrid(page, m)
    await page.waitForFunction(() => (window as unknown as { __game: { getState: () => GameState } }).__game.getState().prompt?.kind === 'monster', null, { timeout: 25_000 }).catch(() => undefined)
  }
  await page.keyboard.press('e')
  const battle = page.getByRole('dialog', { name: /Battle with Sproutling/ })
  await expect(battle).toBeVisible()
  for (let i = 0; i < 10 && !(await page.getByRole('button', { name: 'Back to the village' }).count()); i++) {
    await answerCorrectly(page)
    if (await page.getByRole('button', { name: 'Continue' }).count()) await page.getByRole('button', { name: 'Continue' }).click()
  }
  await expect(battle).toContainText('Victory!')
  await page.getByRole('button', { name: 'Back to the village' }).click()

  // Home reads totals from the server; a reload must show the same.
  await page.goto('/home')
  const stat = (label: string) => page.locator('dt', { hasText: label }).locator('xpath=following-sibling::dd')
  await expect(stat('XP')).toHaveText(/^\d+$/) // wait for the server numbers, not the "–" placeholder
  await expect(stat('Gold')).toHaveText(/^\d+$/)
  const xp = Number(await stat('XP').innerText())
  const gold = Number(await stat('Gold').innerText())
  expect(xp).toBeGreaterThanOrEqual(20 + 3 * 5) // defeat bonus + at least three correct answers
  expect(gold).toBeGreaterThanOrEqual(8)
  await page.reload()
  await expect(stat('XP')).toHaveText(String(xp))
  await expect(stat('Gold')).toHaveText(String(gold))
})

test.describe('360 × 740 phone', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true })

  test('world controls fit without overlap or horizontal scroll', async ({ page }) => {
    test.setTimeout(180_000)
    await newPlayer(page)
    await enterWorld(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
    const hud = (await page.getByRole('region', { name: 'Your hero' }).boundingBox())!
    const map = (await page.getByRole('button', { name: /Enlarge map/ }).boundingBox())!
    const pad = (await page.getByLabel('Movement pad').boundingBox())!
    expect(map.y).toBeGreaterThanOrEqual(hud.y + hud.height) // minimap sits below the player card
    expect(pad.y + pad.height).toBeLessThanOrEqual(740)
  })
})
