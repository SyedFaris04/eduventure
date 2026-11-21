import { expect, test } from '@playwright/test'
import { enterWorld, newPlayer, walkUntil } from './helpers'

test('slash a tree three times to harvest it (no question), then open the camp workbench', async ({ page }) => {
  test.setTimeout(240_000)
  await newPlayer(page)
  await enterWorld(page)

  // The north forest: the tree at (17, 6), reached from the south (17, 7).
  await walkUntil(page, { x: 17, y: 7 }, 'harvest')
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('e')
    await page.waitForTimeout(250)
  }
  await expect(page.getByRole('dialog')).toHaveCount(0) // no question any more
  await expect(page.getByRole('status').filter({ hasText: '+2 Wood' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Your materials' })).toBeVisible()
  // The materials sit under the player card, never on top of it.
  const card = (await page.getByRole('region', { name: 'Your hero' }).boundingBox())!
  const bar = (await page.getByRole('list', { name: 'Your materials' }).boundingBox())!
  expect(bar.y).toBeGreaterThanOrEqual(card.y + card.height)

  // The camp workbench at (25, 6).
  await walkUntil(page, { x: 25, y: 7 }, 'workbench')
  await page.keyboard.press('e')
  const bench = page.getByRole('dialog', { name: 'Camp workbench' })
  await expect(bench.getByRole('button', { name: 'Craft Stone axe' })).toBeDisabled()
  await bench.getByRole('tab', { name: 'Camp' }).click()
  await expect(bench.getByText('Camp bench')).toBeVisible()
  await page.screenshot({ path: 'test-results/workbench.png' })
})
