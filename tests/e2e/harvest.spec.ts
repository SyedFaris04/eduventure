import { expect, test } from '@playwright/test'
import { answerCorrectly, enterWorld, newPlayer, walkUntil } from './helpers'

test('harvest a tree with one question, then open the camp workbench', async ({ page }) => {
  test.setTimeout(240_000)
  await newPlayer(page)
  await enterWorld(page)

  // The north forest: the tree at (17, 6), reached from the south (17, 7).
  await walkUntil(page, { x: 17, y: 7 }, 'harvest')
  await page.keyboard.press('e')
  await expect(page.getByRole('dialog')).toBeVisible()
  await answerCorrectly(page)
  await expect(page.getByText(/\+2 Wood/)).toBeVisible()
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('list', { name: 'Your materials' })).toBeVisible()

  // The camp workbench at (25, 6).
  await walkUntil(page, { x: 25, y: 7 }, 'workbench')
  await page.keyboard.press('e')
  const bench = page.getByRole('dialog', { name: 'Camp workbench' })
  await expect(bench.getByRole('button', { name: 'Craft Stone axe' })).toBeDisabled()
  await bench.getByRole('tab', { name: 'Camp' }).click()
  await expect(bench.getByText('Camp bench')).toBeVisible()
  await page.screenshot({ path: 'test-results/workbench.png' })
})
