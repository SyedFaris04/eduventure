import { expect, test, type Page } from '@playwright/test'
import { setCamera, walk } from './camera'
import { shot } from './recorder'

// Multiplayer is built but not online yet (the room server isn't deployed): this records it working against a local
// room server, so the videos can show it labelled COMING SOON. Run with the local servers up:
//   npm run dev --prefix server/rooms                       (room server on 8787)
//   VITE_ROOMS_URL=ws://localhost:8787 npx vite --port 5176  (game pointed at it)
test.use({ baseURL: 'http://localhost:5176' })

async function player(page: Page, name: string) {
  const next = () => page.getByRole('button', { name: /^Next/ }).click()
  await page.goto('/welcome')
  await page.getByRole('button', { name: /Start Your Adventure/ }).click()
  await page.getByLabel('Year you were born').selectOption('2000')
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
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Surprise me' }).click()
  await page.getByRole('tab', { name: 'Name' }).click()
  await page.getByLabel('Hero name').fill(name)
  await page.getByRole('button', { name: 'Save hero' }).click()
  await expect(page).toHaveURL(/\/home$/)
  await page.getByRole('link', { name: /Enter the World/ }).click()
  await page.waitForFunction(() => ((window as unknown as { __game?: { getState: () => { player: { x: number } } } }).__game?.getState().player.x ?? 0) > 0, null, { timeout: 30_000 })
  await setCamera(page, { tilt: 40, distance: 14, yaw: 0 })
}

test('two players meet and wave', async ({ browser }) => {
  test.setTimeout(600_000)
  const a = await (await browser.newContext({ viewport: null })).newPage()
  const b = await (await browser.newContext({ viewport: null })).newPage()
  await player(a, 'Aina')
  await player(b, 'Wei Jie')
  await expect(a.getByRole('button', { name: 'Wei Jie: options' })).toBeVisible({ timeout: 60_000 })
  await walk(b, [['ArrowDown', 900]])
  await a.waitForTimeout(2000)
  await shot(a, 'game-multiplayer', async () => {
    await a.waitForTimeout(600)
    await walk(b, [['ArrowUp', 700], ['ArrowRight', 500]])
    await b.getByRole('button', { name: 'Emotes' }).click({ timeout: 5000 })
    await b.getByRole('button', { name: 'Wave' }).click({ timeout: 5000 })
    await expect(a.getByRole('status', { name: 'Wave' })).toBeVisible({ timeout: 10_000 }).catch(() => undefined)
    await a.waitForTimeout(3000)
  })
})
