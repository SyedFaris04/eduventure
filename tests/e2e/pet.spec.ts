import { expect, test } from '@playwright/test'
import { enterWorld, newPlayer } from './helpers'

test('pet egg, pet corner and the world paw button', async ({ page }) => {
  test.setTimeout(120_000)
  await newPlayer(page)

  // A new player is level 1: the egg waits for level 2.
  await page.getByRole('link', { name: 'My pet' }).click()
  await expect(page).toHaveURL(/\/pet$/)
  await expect(page.getByText('Reach level 2 to hatch your egg')).toBeVisible()

  await page.goto('/shop')
  await expect(page.getByRole('heading', { name: 'Pet corner' })).toBeVisible()
  await expect(page.getByTestId('item-pet_bell')).toContainText('50')
  await expect(page.getByText('Hatch a pet to try this on')).toBeVisible()

  await page.goto('/home')
  await enterWorld(page)
  await page.getByRole('link', { name: 'My pet' }).click()
  await expect(page).toHaveURL(/\/pet$/)
})
