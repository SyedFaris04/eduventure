import { readdirSync, readFileSync } from 'node:fs'
import { expect, type Page } from '@playwright/test'

// The test reads answers from the content files, like a student who knows them. The app never ships these files.
type Opt = { id: string; text: string }
type Q = { prompt: string; type: string; answer: unknown; options?: Opt[] | { left: Opt[]; right: Opt[] } }
const dir = new URL('../../content/questions/', import.meta.url)
const bank = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => (JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as { questions: Q[] }).questions)

export type GameState = { prompt: { kind: string; id?: string } | null; player: { x: number; y: number }; monsters: { kind: string; x: number; y: number }[] }
export const state = (page: Page) => page.evaluate(() => (window as unknown as { __game: { getState: () => GameState } }).__game.getState())

export async function newPlayer(page: Page) {
  const next = () => page.getByRole('button', { name: /^Next/ }).click()
  await page.goto('/welcome')
  await page.getByRole('button', { name: /Start Your Adventure/ }).click()
  await page.getByLabel('Year you were born').selectOption('2016')
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
  await page.getByRole('button', { name: 'Save hero' }).click()
  await expect(page).toHaveURL(/\/home$/)
}

export async function enterWorld(page: Page) {
  await page.getByRole('link', { name: /Enter the World/ }).click()
  await expect(page).toHaveURL(/\/world$/)
  await page.waitForFunction(() => ((window as unknown as { __game?: { getState: () => GameState } }).__game?.getState().player.x ?? 0) > 0, null, { timeout: 30_000 })
}

/** Clicks the map at a grid point, wherever the 3D camera currently shows it. */
export async function clickGrid(page: Page, target: { x: number; y: number }) {
  const pt = await page.evaluate((p) => (window as unknown as { __world: { screenOf: (q: { x: number; y: number }) => { x: number; y: number } } }).__world.screenOf(p), target)
  const vp = page.viewportSize()!
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
  // Far targets are clamped into the open middle of the screen, clear of the HUD, minimap and controls; each tap still walks toward them.
  await page.mouse.click(clamp(pt.x, 60, vp.width - 230), clamp(pt.y, 150, vp.height - 230))
}

export async function answerCorrectly(page: Page) {
  const prompt = await page.locator('section[role=dialog] p.text-xl').innerText()
  const q = bank.find((x) => x.prompt === prompt)
  if (!q) throw new Error(`question not found in content/questions: ${prompt}`)
  const dialog = page.locator('section[role=dialog]')
  const list = (q.options ?? []) as Opt[]
  const submit = () => dialog.getByRole('button', { name: 'Answer', exact: true }).click()
  if (q.type === 'mcq') await page.getByRole('button', { name: list.find((o) => o.id === q.answer)!.text, exact: false }).first().click()
  else if (q.type === 'true_false') await page.getByRole('button', { name: q.answer === 'true' ? /True/ : /False/ }).click()
  else if (q.type === 'multi_select') {
    for (const id of q.answer as string[]) await dialog.getByRole('button', { name: list.find((o) => o.id === id)!.text, exact: true }).click()
    await submit()
  } else if (q.type === 'ordering') {
    // Bubble each item up into place using the "Move … up" buttons.
    const target = (q.answer as string[]).map((id) => list.find((o) => o.id === id)!.text)
    const current = list.map((o) => o.text)
    for (let i = 0; i < target.length; i++) {
      for (let j = current.indexOf(target[i]); j > i; j--) {
        await dialog.getByRole('button', { name: `Move ${target[i]} up`, exact: true }).click()
        ;[current[j - 1], current[j]] = [current[j], current[j - 1]]
      }
    }
    await submit()
  } else if (q.type === 'matching') {
    const { left } = q.options as { left: Opt[] }
    const pairs = q.answer as Record<string, string>
    for (const [i, l] of left.entries()) await dialog.locator('select').nth(i).selectOption(pairs[l.id])
    await submit()
  } else {
    const a = q.answer as { value?: number; accept?: string[] }
    await page.getByLabel('Your answer').fill(q.type === 'numeric' ? String(a.value) : a.accept![0])
    await page.getByRole('button', { name: 'Answer', exact: true }).click()
  }
  await expect(page.getByText(/Correct!/)).toBeVisible({ timeout: 15_000 })
}

