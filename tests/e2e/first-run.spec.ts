import { expect, test, type Page } from '@playwright/test'

const tapToStart = (page: Page) => page.getByRole('button', { name: 'Tap to start' })
const next = (page: Page) => page.getByRole('button', { name: /^Next/ }).click()

async function passLoading(page: Page) {
  await page.goto('/')
  await expect(tapToStart(page)).toBeVisible({ timeout: 30_000 })
  // Real progress: only reaches 100 once every startup task has settled.
  await expect(page.getByRole('progressbar', { name: 'Loading progress' })).toHaveAttribute('aria-valuenow', '100')
  await tapToStart(page).click()
}

async function startGuest(page: Page) {
  await page.goto('/welcome')
  await page.getByRole('button', { name: /Start Your Adventure/ }).click()
  await expect(page).toHaveURL(/\/onboarding/)
}

const noHorizontalScroll = async (page: Page, width: number) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)

test('first run: loading → guest → onboarding → character → home, still there after reload', async ({ page }) => {
  await passLoading(page)
  await expect(page).toHaveURL(/\/welcome$/)
  await page.getByRole('button', { name: /Start Your Adventure/ }).click()
  await expect(page).toHaveURL(/\/onboarding/)

  await page.getByLabel('Year you were born').selectOption('2000')
  await next(page)
  await page.getByRole('button', { name: /Upper Secondary School/ }).click()
  await next(page)
  await page.getByRole('listbox', { name: 'Where do you study?' }).getByRole('option', { name: /Malaysia/ }).click()
  await next(page)
  await page.getByRole('button', { name: /KSSM/ }).click()
  await next(page)
  await page.getByRole('button', { name: 'Tingkatan 5' }).click()
  await next(page)
  await page.getByRole('button', { name: 'English', exact: true }).click()
  await next(page)
  await page.getByRole('button', { name: 'Mathematics', exact: true }).click()
  await next(page)
  await page.getByRole('button', { name: 'Prepare for exams' }).click()
  await next(page)
  await page.getByRole('button', { name: /Intermediate/ }).click()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page).toHaveURL(/\/character$/)
  await page.getByRole('button', { name: 'Surprise me' }).click()
  await page.getByRole('tab', { name: 'Name' }).click()
  await page.getByLabel('Hero name').fill('Test Ranger')
  await page.getByRole('button', { name: 'Save hero' }).click()

  await expect(page).toHaveURL(/\/home$/)
  const stat = (label: string) => page.locator('dt', { hasText: label }).locator('xpath=following-sibling::dd')
  await expect(page.getByRole('heading', { name: 'Welcome, Test Ranger!' })).toBeVisible()
  await expect(stat('Level')).toHaveText('1')
  await expect(stat('Gold')).toHaveText('0')
  await expect(page.getByRole('link', { name: /Enter the World/ })).toHaveAttribute('href', '/world')

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Welcome, Test Ranger!' })).toBeVisible()

  // A returning player goes from the loading screen straight to Home.
  await passLoading(page)
  await expect(page).toHaveURL(/\/home$/)
})

test('a guest who has not finished onboarding cannot open the character creator', async ({ page }) => {
  await startGuest(page)
  await page.goto('/character')
  await expect(page).toHaveURL(/\/onboarding/)
})

test('signed-out visitors are sent to the welcome page', async ({ page }) => {
  await page.goto('/home')
  await expect(page).toHaveURL(/\/welcome$/)
})

test('choosing Arabic switches the layout to right-to-left', async ({ page }) => {
  await page.goto('/welcome')
  await page.getByLabel('Language').selectOption('ar')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('button', { name: /ابدأ مغامرتك/ })).toBeVisible()
})

test.describe('320 × 640 phone', () => {
  test.use({ viewport: { width: 320, height: 640 } })

  test('loading, welcome, onboarding and character pages have no horizontal scroll', async ({ page }) => {
    await page.goto('/')
    await expect(tapToStart(page)).toBeVisible({ timeout: 30_000 })
    await noHorizontalScroll(page, 320)
    await tapToStart(page).click()
    await expect(page).toHaveURL(/\/welcome$/)
    await noHorizontalScroll(page, 320)

    await page.getByRole('button', { name: /Start Your Adventure/ }).click()
    await expect(page).toHaveURL(/\/onboarding/)
    await page.getByLabel('Year you were born').selectOption('1990')
    await next(page)
    await noHorizontalScroll(page, 320)
    await page.getByRole('button', { name: /Lifelong/ }).click()
    await next(page)
    await page.getByRole('listbox', { name: 'Where do you study?' }).getByRole('option').first().click()
    await next(page)
    await page.getByRole('button', { name: /International/ }).click()
    await next(page)
    await next(page) // language
    await page.getByRole('button', { name: 'Psychology', exact: true }).click()
    await next(page)
    await next(page) // goals
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page).toHaveURL(/\/character$/)
    await noHorizontalScroll(page, 320)
  })
})
