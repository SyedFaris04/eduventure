import { expect, test } from '@playwright/test'
import { answerCorrectly, promptIs, state } from '../../../../tests/e2e/helpers'
import { shot } from './recorder'

// The real phone experience: the game held sideways (decision #46), touch controls, a battle question.
test.use({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })

test('phone, sideways', async ({ page }) => {
  test.setTimeout(900_000)
  const next = () => page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.goto('/welcome')
  await page.getByRole('button', { name: /Start Your Adventure/ }).click()
  await page.getByLabel('Year you were born').selectOption('2000')
  await next()
  await page.getByRole('button', { name: /Lower Secondary School/ }).click()
  await next()
  await page.getByPlaceholder('Search countries').fill('Malaysia') // phones page the list: search, as a player would
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
  await page.getByRole('tab', { name: 'Name' }).click()
  await page.getByLabel('Hero name').fill('Aina')
  await page.getByRole('button', { name: 'Save hero' }).click()
  await expect(page).toHaveURL(/\/home$/)
  await page.getByRole('link', { name: /Enter the World/ }).click()
  await page.waitForFunction(() => ((window as unknown as { __game?: { getState: () => { player: { x: number } } } }).__game?.getState().player.x ?? 0) > 0, null, { timeout: 30_000 })
  await page.waitForTimeout(2500)

  await shot(page, 'phone-world', async () => {
    await page.keyboard.down('ArrowUp')
    await page.waitForTimeout(1800)
    await page.keyboard.up('ArrowUp')
    await page.keyboard.down('ArrowLeft')
    await page.waitForTimeout(1500)
    await page.keyboard.up('ArrowLeft')
    await page.waitForTimeout(500)
  })
  for (let i = 0; i < 14 && (await state(page)).prompt?.kind !== 'monster'; i++) {
    const s = await state(page)
    const m = [...s.monsters].sort((a, b) => Math.hypot(a.x - s.player.x, a.y - s.player.y) - Math.hypot(b.x - s.player.x, b.y - s.player.y))[0]
    const pt = await page.evaluate((p) => (window as unknown as { __world: { screenOf: (q: { x: number; y: number }) => { x: number; y: number } } }).__world.screenOf(p), m)
    await page.mouse.click(Math.max(220, Math.min(600, pt.x)), Math.max(110, Math.min(300, pt.y)))
    await promptIs(page, 'monster').catch(() => undefined)
  }
  await shot(page, 'phone-battle', async () => {
    await page.waitForTimeout(500)
    await page.keyboard.press('e')
    await expect(page.getByRole('dialog', { name: /Battle with/ })).toBeVisible()
    for (let i = 0; i < 2; i++) {
      await page.waitForTimeout(1600)
      await answerCorrectly(page)
      await page.waitForTimeout(1500)
      if (await page.getByRole('button', { name: 'Continue' }).count()) await page.getByRole('button', { name: 'Continue' }).click()
    }
    await page.waitForTimeout(1000)
  })
})
