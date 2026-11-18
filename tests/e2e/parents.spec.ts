import { expect, test } from '@playwright/test'
import { newPlayer } from './helpers'

test('a child asks a parent; the link on the same phone asks for the parent’s own phone', async ({ page }) => {
  test.setTimeout(120_000)
  await newPlayer(page) // born 2016: under 13, so a parent must approve

  // Classes wait for a parent too.
  await expect(page.getByText(/a parent must approve your account before you can join a class/i)).toBeVisible()
  await page.getByRole('button', { name: 'Ask my parent' }).click()
  const code = page.locator('p.font-mono')
  await expect(code).toHaveText(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/)
  const value = await code.innerText()
  await expect(page.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute('href', new RegExp(`wa\\.me/.*${encodeURIComponent(`/parent?code=${value}`).replace(/[.?*+^$()|[\]\\]/g, '\\$&')}`))

  // Opening the link here (the child's guest session) must not sign the child out.
  await page.goto(`/parent?code=${value}`)
  await expect(page.getByText(/open this link on your own phone/i)).toBeVisible()
  await page.goto('/home')
  await expect(page.getByRole('heading', { name: /Welcome/ })).toBeVisible()
  await expect(page.locator('p.font-mono')).toHaveText(value)

  // The teacher page asks a guest for a teacher account.
  await page.goto('/teacher')
  await expect(page.getByText(/teachers need their own account/i)).toBeVisible()
})
