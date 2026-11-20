import { expect, test } from '@playwright/test'
import { enterWorld, newPlayer } from './helpers'

test('two players see each other, wave, and a hidden player is not seen', async ({ browser }) => {
  const a = await (await browser.newContext()).newPage()
  const b = await (await browser.newContext()).newPage()
  await newPlayer(a, { year: '2000', name: 'Alpha Rider' })
  await newPlayer(b, { year: '2000', name: 'Beta Rider' })
  await enterWorld(a)
  await enterWorld(b)

  // Each sees the other's name tag over their hero.
  await expect(a.getByRole('button', { name: 'Beta Rider: options' })).toBeVisible({ timeout: 45_000 })
  await expect(b.getByRole('button', { name: 'Alpha Rider: options' })).toBeVisible()

  // B waves; A sees the bubble over B.
  await b.getByRole('button', { name: 'Emotes' }).click()
  await b.getByRole('button', { name: 'Wave' }).click()
  await expect(a.getByRole('status', { name: 'Wave' })).toBeVisible()
  await a.screenshot({ path: 'test-results/multiplayer-a.png' })

  // B hides from other players: A no longer sees B.
  await b.getByRole('button', { name: 'Settings' }).click()
  await b.getByRole('checkbox', { name: 'Let other players see me' }).uncheck()
  await expect(a.getByRole('button', { name: 'Beta Rider: options' })).toHaveCount(0, { timeout: 15_000 })
})
