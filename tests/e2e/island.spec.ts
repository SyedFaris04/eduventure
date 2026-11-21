import { readdirSync, readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { enterWorld, newPlayer } from './helpers'

// Real Greenhaven nodes (materials come from slashing them, through the game's own signed-in client).
const dir = new URL('../../supabase/migrations/', import.meta.url)
const nodesSql = readFileSync(new URL(readdirSync(dir).filter((f) => f.endsWith('_harvest_nodes.sql')).sort().at(-1)!, dir), 'utf8')
const nodes = (kind: string) => [...nodesSql.matchAll(new RegExp(`\\('greenhaven', (\\d+), (\\d+), '${kind}'`, 'g'))].map((m) => ({ x: +m[1], y: +m[2] }))

type Rpc = (fn: string, args?: object) => Promise<{ data: unknown; error: { message: string } | null }>
const rpc = (page: Page, fn: string, args: object = {}) =>
  page.evaluate(
    async ([f, a]) => {
      const { supabase } = (await import('/src/services/supabase.ts' as string)) as { supabase: { rpc: Rpc } }
      const r = await supabase.rpc(f as string, a as object)
      return { data: r.data, error: r.error?.message ?? null }
    },
    [fn, args] as const,
  )

/** Clicks the middle of a tile, wherever the camera shows it. */
async function tapTile(page: Page, x: number, y: number) {
  const pt = await page.evaluate((p) => (window as unknown as { __world: { screenOf: (q: { x: number; y: number }) => { x: number; y: number } } }).__world.screenOf(p), { x: x + 0.5, y: y + 0.5 })
  await page.mouse.click(pt.x, pt.y)
}

test('build on My island: place, turn, move, remove, and it is still there after a reload', async ({ page }) => {
  test.setTimeout(300_000)
  await newPlayer(page, { year: '2000', name: 'Island Builder' })
  await enterWorld(page)
  for (const [kind, n] of [['herb', 2], ['harvest_tree', 2]] as const)
    for (const node of nodes(kind).slice(0, n)) {
      await page.waitForTimeout(1700)
      expect((await rpc(page, 'slash_harvest', { p_place: 'greenhaven', p_x: node.x, p_y: node.y })).error).toBeNull()
    }

  // Sail to My island.
  await page.evaluate(() => (window as unknown as { __game: { setState: (s: object) => void } }).__game.setState({ travel: { to: 'my_island' } }))
  await page.getByRole('button', { name: 'Build' }).waitFor({ timeout: 60_000 })
  await page.waitForTimeout(2500) // the camera settles after the boat ride, so taps land on the intended tiles
  await page.getByRole('button', { name: 'Build' }).click()
  const panel = page.getByRole('region', { name: 'Build' })
  const status = panel.getByRole('status')

  await panel.getByRole('tab', { name: 'Garden' }).click()
  await panel.getByRole('button', { name: /Round bush/ }).click()
  await tapTile(page, 16, 24)
  await expect(status).toHaveText('Placed!')
  await tapTile(page, 16, 24) // the same spot again: taken
  await expect(status).toHaveText("Doesn't fit there")

  await panel.getByRole('tab', { name: 'Paths & fences' }).click()
  await panel.getByRole('button', { name: /Wooden fence/ }).click()
  await panel.getByRole('button', { name: 'Turn', exact: true }).click()
  await tapTile(page, 13, 24)
  await expect(status).toHaveText('Placed!')

  await page.mouse.move(640, 300)
  await page.waitForTimeout(400)
  await page.screenshot({ path: 'test-results/island-build.png' })
  await panel.getByRole('button', { name: 'Move', exact: true }).click()
  await tapTile(page, 16, 24)
  await tapTile(page, 18, 23)
  await expect(status).toHaveText('Moved!')

  await panel.getByRole('button', { name: 'Remove', exact: true }).click()
  await tapTile(page, 13, 24)
  await expect(status).toHaveText('Removed. Materials returned.')

  const items = (await rpc(page, 'my_island')).data as { item: string; x: number; y: number }[]
  expect(items).toEqual([expect.objectContaining({ item: 'bush_round', x: 18, y: 23 })])

  // A sideways phone: the build panel fits and Done is on screen.
  await page.setViewportSize({ width: 740, height: 360 })
  await page.waitForTimeout(500)
  const box = (await panel.boundingBox())!
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.y + box.height).toBeLessThanOrEqual(361)
  await expect(panel.getByRole('button', { name: 'Done' })).toBeInViewport()
  await page.screenshot({ path: 'test-results/island-build-phone.png' })
  await panel.getByRole('button', { name: 'Done' }).click()

  // Still there after a reload (the game reopens on My island).
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.reload()
  await page.getByRole('button', { name: /Tap to start/ }).click({ timeout: 60_000 }).catch(() => {})
  await page.goto('/world')
  await page.getByRole('button', { name: 'Build' }).waitFor({ timeout: 60_000 })
  expect(((await rpc(page, 'my_island')).data as unknown[]).length).toBe(1)
})
