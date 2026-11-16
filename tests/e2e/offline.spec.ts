import { expect, test } from '@playwright/test'

// Runs against the dev server on 5174 whose Supabase URL points at a closed port.
test('loading still completes when the server is unreachable, and the welcome page says so', async ({ page }) => {
  await page.goto('/')
  const start = page.getByRole('button', { name: 'Tap to start' })
  await expect(start).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('progressbar', { name: 'Loading progress' })).toHaveAttribute('aria-valuenow', '100')
  await start.click()
  await expect(page).toHaveURL(/\/welcome$/)
  await expect(page.getByRole('alert')).toContainText("Can't reach the server")
})
