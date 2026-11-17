import { expect, test } from '@playwright/test'
import { clickGrid, enterWorld, newPlayer, place, promptIs, sail, state, walkUntil } from './helpers'

const SCIENCE = ['science', 'biology', 'chemistry', 'physics', 'environmental_science']
test('sail to Science Island and fight', async ({ page }) => {
  test.setTimeout(480_000) // two boat rides and long walks on software rendering
  await newPlayer(page)
  await enterWorld(page)
  expect(await place(page)).toBe('greenhaven')

  // Pak Hamid stands at the jetty south of the village road.
  await walkUntil(page, { x: 17.5, y: 32.5 }, 'npc', 'boatman')
  await sail(page, /Sail to Science Island/, 'science_island')
  await expect(page.locator('[data-area-banner]')).toHaveText('Pekan Kuching', { timeout: 10_000 })

  // Fight the nearest island monster: its question comes from the science family, chosen by the server.
  for (let i = 0; i < 14 && (await state(page)).prompt?.kind !== 'monster'; i++) {
    const s = await state(page)
    const m = [...s.monsters].sort((a, b) => Math.hypot(a.x - s.player.x, a.y - s.player.y) - Math.hypot(b.x - s.player.x, b.y - s.player.y))[0]
    await clickGrid(page, m)
    await promptIs(page, 'monster').catch(() => undefined)
  }
  const started = page.waitForResponse((r) => r.url().includes('/rpc/start_encounter'))
  await page.keyboard.press('e')
  const body = await (await started).json()
  expect(['hornbill', 'tapir', 'pangolin']).toContain(body.monster_id)
  expect(SCIENCE).toContain(body.question.subject)
  const battle = page.getByRole('dialog', { name: /Battle with/ })
  await expect(battle).toBeVisible()
  await battle.getByRole('button', { name: 'Run away' }).click()
  await expect(battle).toHaveCount(0)

  // Back to the jetty and home.
  await walkUntil(page, { x: 21.5, y: 39.5 }, 'npc', 'boatman')
  await sail(page, /Sail to Greenhaven Kampung/, 'greenhaven')
})
