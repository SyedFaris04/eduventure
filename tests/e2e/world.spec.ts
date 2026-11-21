import { expect, test } from '@playwright/test'

import { answerCorrectly, answerWrongly, clickGrid, enterWorld, newPlayer, state, type GameState } from './helpers'

test('walk, talk to the Elder, win a battle; Home shows the server totals after a reload', async ({ page }) => {
  test.setTimeout(240_000)
  await newPlayer(page)
  await enterWorld(page)

  const start = (await state(page)).player
  await page.keyboard.down('ArrowUp')
  await page.waitForFunction((y) => (window as unknown as { __game: { getState: () => GameState } }).__game.getState().player.y < y - 0.5, start.y, { timeout: 20_000 })
  await page.keyboard.up('ArrowUp')

  // Elder Rowan stands at tile (12, 29). The camera eases after the hero, so let it settle before tapping.
  for (let i = 0; i < 4 && (await state(page)).prompt?.kind !== 'npc'; i++) {
    await page.waitForTimeout(1500)
    await clickGrid(page, { x: 12.5, y: 29.5 })
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
  // One mistake first: the "Why not?" card explains it and promises it will come back.
  let missed = false
  for (let i = 0; i < 12 && !(await page.getByRole('button', { name: 'Back to the village' }).count()); i++) {
    if (missed || !(missed = await answerWrongly(page))) await answerCorrectly(page)
    if (await page.getByRole('button', { name: 'Continue' }).count()) await page.getByRole('button', { name: 'Continue' }).click()
  }
  expect(missed).toBe(true)
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

  // The shop shows the same gold, and an item you cannot afford says how much more you need.
  await page.getByRole('link', { name: 'Shop', exact: true }).click()
  await expect(page).toHaveURL(/\/shop$/)
  await expect(page.getByText(`${gold} gold`, { exact: true })).toBeVisible()
  const crown = page.getByTestId('item-leaf_crown')
  await expect(crown.getByRole('img', { name: /wearing the Leaf Crown/ })).toBeVisible()
  if (gold < 80) {
    await expect(crown.getByRole('button', { name: 'Buy Leaf Crown' })).toBeDisabled()
    await expect(crown).toContainText(`${80 - gold} more gold needed`)
  }
})

test.describe('phone (plays sideways, decision #46)', () => {
  test.use({ viewport: { width: 740, height: 360 }, hasTouch: true, isMobile: true })

  test('held upright it asks to turn; sideways the controls fit without overlap or horizontal scroll', async ({ page }) => {
    test.setTimeout(180_000)
    await newPlayer(page)
    await enterWorld(page)
    await page.setViewportSize({ width: 360, height: 740 })
    await expect(page.getByRole('alertdialog', { name: 'Turn your phone sideways' })).toBeVisible()
    await page.setViewportSize({ width: 740, height: 360 })
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await page.waitForTimeout(400)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(740)
    const hud = (await page.getByRole('region', { name: 'Your hero' }).boundingBox())!
    const pad = (await page.getByLabel('Movement pad').boundingBox())!
    const overlap = hud.x < pad.x + pad.width && pad.x < hud.x + hud.width && hud.y < pad.y + pad.height && pad.y < hud.y + hud.height
    expect(overlap).toBe(false)
    expect(pad.y + pad.height).toBeLessThanOrEqual(360)
  })
})
