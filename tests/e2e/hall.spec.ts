import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { enterWorld, newPlayer, place, sail, state, walkUntil, type GameState } from './helpers'

type Step = { kind: string; text: string; word?: string; options?: { id: string; text: string }[]; answer?: string | string[]; pairs?: [string, string][]; accept?: string[] }
const course = JSON.parse(readFileSync(new URL('../../content/courses/english-basics.json', import.meta.url), 'utf8')) as { units: { lessons: { id: string; steps: Step[] }[] }[] }
const lesson1 = course.units[0].lessons[0]

/** Plays a language lesson like a learner who knows the answers. Listen steps are skipped on devices with no voice. */
async function playLesson(page: Page, steps: Step[]) {
  for (const [i, s] of steps.entries()) {
    const shown = page.getByText(s.text, { exact: true }).first()
    if (s.kind === 'listen' && !(await shown.isVisible().catch(() => false))) continue // skipped: no voice here
    await expect(shown).toBeVisible({ timeout: 20_000 })
    const isLast = i === steps.length - 1 || (i === steps.length - 2 && steps[steps.length - 1].kind === 'listen')
    if (s.kind !== 'card') await page.waitForTimeout(1200) // the server wants a moment between answers
    const option = (id: string) => s.options!.find((o) => o.id === id)!.text
    if (s.kind === 'pick' || s.kind === 'gap' || s.kind === 'listen') await page.getByRole('button', { name: option(s.answer as string), exact: true }).click()
    if (s.kind === 'match') {
      for (const [l, r] of s.pairs!) {
        await page.getByRole('button', { name: l, exact: true }).click()
        await page.getByRole('button', { name: r, exact: true }).click()
      }
      await page.getByRole('button', { name: 'Check' }).click()
    }
    if (s.kind === 'build') {
      const tray = page.getByRole('group', { name: 'Words' })
      for (const w of s.answer as string[]) await tray.getByRole('button', { name: w, exact: true }).first().click()
      await page.getByRole('button', { name: 'Check' }).click()
    }
    if (s.kind === 'type') {
      await page.getByLabel('Your answer').fill(s.accept![0])
      await page.getByRole('button', { name: 'Check' }).click()
    }
    if (s.kind !== 'card') await expect(page.getByText('Correct!')).toBeVisible()
    const next = page.getByRole('button', { name: isLast ? 'Finish lesson' : 'Continue' })
    if (!isLast && !(await next.isVisible())) await page.getByRole('button', { name: 'Finish lesson' }).click() // the last step was a skipped listen
    else await next.click()
  }
}

test('english lesson in the hall', async ({ page }) => {
  test.setTimeout(480_000)
  await newPlayer(page)
  await enterWorld(page)
  await walkUntil(page, { x: 17.5, y: 32.5 }, 'npc', 'boatman')
  await sail(page, /Sail to Language Kingdom/, 'language_kingdom')

  // Cikgu Lina stands at the Language Hall door (tile 22, 11).
  await walkUntil(page, { x: 21.5, y: 12.5 }, 'npc', 'linguist')
  const door = (await state(page)).player
  await page.keyboard.press('e')
  await expect(page).toHaveURL(/\/hall$/)
  await expect(page.getByRole('heading', { name: /Language Hall/ })).toBeVisible()
  await expect(page.getByText('Python Basics')).toHaveCount(0) // coding courses live in the Code Academy

  await page.getByRole('link', { name: /English for Malaysian students/ }).click()
  await page.getByRole('link', { name: /1\.1 Greetings/ }).click()
  await playLesson(page, lesson1.steps)
  await expect(page.getByText('Lesson complete!')).toBeVisible()
  await expect(page.getByText('+25 XP')).toBeVisible()

  await page.getByRole('button', { name: 'Back to course' }).click()
  await page.getByRole('link', { name: 'All courses' }).click()
  await page.getByRole('link', { name: 'Back to the world' }).click()
  await expect(page).toHaveURL(/\/world$/)
  await page.waitForFunction(() => ((window as unknown as { __game?: { getState: () => GameState } }).__game?.getState().player.x ?? 0) > 0, null, { timeout: 30_000 })
  expect(await place(page)).toBe('language_kingdom')
  const back = (await state(page)).player
  expect(Math.hypot(back.x - door.x, back.y - door.y)).toBeLessThan(2)
})
