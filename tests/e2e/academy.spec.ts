import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { enterWorld, newPlayer, place, sail, state, walkUntil, type GameState } from './helpers'

type Step = { kind: string; text: string; code?: string; options?: { id: string; text: string }[]; answer?: string; answer_text?: string; broken_line?: number; accept?: string[]; solution?: string; expected_output?: string }
const course = JSON.parse(readFileSync(new URL('../../content/courses/python-basics.json', import.meta.url), 'utf8')) as { units: { lessons: { id: string; steps: Step[] }[] }[] }
const lesson1 = course.units[0].lessons[0]
const cpp = JSON.parse(readFileSync(new URL('../../content/courses/cpp-basics.json', import.meta.url), 'utf8')) as typeof course

/** Replaces everything in the code editor (insertText skips CodeMirror's auto-closing brackets). */
async function setCode(page: Page, code: string) {
  const editor = page.getByLabel('Your code')
  await editor.click()
  await page.keyboard.press('Control+A')
  await page.keyboard.insertText(code)
}

/** Plays every step of a lesson like a learner who knows the answers. C++ has no runner: outputs are shown instead. */
async function playLesson(page: Page, steps: Step[], { runs = true } = {}) {
  for (const [i, s] of steps.entries()) {
    await expect(page.getByText(s.text)).toBeVisible({ timeout: 20_000 })
    const next = i === steps.length - 1 ? 'Finish lesson' : 'Continue'
    if (s.kind === 'learn') {
      if (runs) await page.getByRole('button', { name: 'Run' }).click()
      else await expect(page.getByRole('button', { name: 'Run' })).toHaveCount(0)
      await expect(page.getByLabel('Terminal')).toContainText(s.expected_output!.split('\n')[0], { timeout: 60_000 }) // Python downloads on the first run
    }
    if (s.kind === 'predict') {
      await page.waitForTimeout(1200) // the server wants a moment between answers
      if (s.options) await page.getByRole('button', { name: s.options.find((o) => o.id === s.answer)!.text, exact: true }).click()
      else {
        await page.getByLabel('Your answer').fill(s.answer_text!)
        await page.getByRole('button', { name: 'Check' }).click()
      }
      await expect(page.getByText('Correct!')).toBeVisible()
    }
    if (s.kind === 'fix') {
      await page.waitForTimeout(1200)
      const lines = s.code!.split('\n')
      lines[s.broken_line! - 1] = s.accept![0]
      await setCode(page, lines.join('\n'))
      await page.getByRole('button', { name: 'Check' }).click()
      await expect(page.getByText('Correct!')).toBeVisible()
      if (!runs) await expect(page.getByLabel('Terminal')).toContainText(s.expected_output!.split('\n')[0]) // the fixed program's output
    }
    if (s.kind === 'write') {
      await setCode(page, s.solution!)
      await page.getByRole('button', { name: 'Check' }).click()
      await expect(page.getByLabel('Terminal')).toContainText(s.expected_output!.split('\n')[0], { timeout: 60_000 })
    }
    await page.getByRole('button', { name: next }).click()
  }
}

test('python lesson in the browser', async ({ page }) => {
  test.setTimeout(300_000)
  await newPlayer(page)
  await page.getByRole('link', { name: 'Code Academy' }).click()
  await expect(page).toHaveURL(/\/academy$/)
  await page.getByRole('link', { name: /Python Basics/ }).click()
  await page.getByRole('link', { name: /1\.1 Your first print/ }).click()

  await playLesson(page, lesson1.steps)
  await expect(page.getByText('Lesson complete!')).toBeVisible()
  await expect(page.getByText('+25 XP')).toBeVisible()

  // A replay is fine for practice but pays nothing.
  await page.goto(`/academy/python-basics/${lesson1.id}`)
  await playLesson(page, lesson1.steps)
  await expect(page.getByText(/already earned this lesson's reward/)).toBeVisible()
})

test('Cikgu Byte opens the Academy, and Back returns to the Academy door', async ({ page }) => {
  test.setTimeout(420_000)
  await newPlayer(page)
  await enterWorld(page)
  await walkUntil(page, { x: 17.5, y: 48.5 }, 'npc', 'boatman')
  await sail(page, /Sail to Technology City/, 'technology_city')

  // Cikgu Byte stands at the Academy door (tile 22, 11).
  await walkUntil(page, { x: 21.5, y: 28.5 }, 'npc', 'teacher')
  const door = (await state(page)).player
  await page.keyboard.press('e')
  await expect(page).toHaveURL(/\/academy$/)
  await expect(page.getByRole('link', { name: 'Back to the world' })).toBeVisible()

  await page.getByRole('link', { name: /JavaScript Basics/ }).click()
  await expect(page.getByRole('link', { name: /1\.1 / })).toBeVisible()
  await expect(page.getByRole('link', { name: /2\.1 / })).toHaveCount(0) // Unit 2 is locked until Unit 1 is done
  await page.getByRole('link', { name: 'All courses' }).click()
  await page.getByRole('link', { name: 'Back to the world' }).click()
  await expect(page).toHaveURL(/\/world$/)
  await page.waitForFunction(() => ((window as unknown as { __game?: { getState: () => GameState } }).__game?.getState().player.x ?? 0) > 0, null, { timeout: 30_000 })
  expect(await place(page)).toBe('technology_city')
  const back = (await state(page)).player
  expect(Math.hypot(back.x - door.x, back.y - door.y)).toBeLessThan(2)
})

test.describe('phone, sideways', () => {
  test.use({ viewport: { width: 740, height: 360 }, hasTouch: true, isMobile: true })

  test('the lesson page fits without horizontal scroll', async ({ page }) => {
    test.setTimeout(240_000)
    await newPlayer(page)
    await page.goto('/academy/python-basics/py-u1-l1')
    await expect(page.getByText(lesson1.steps[0].text)).toBeVisible({ timeout: 30_000 })
    for (let i = 0; i < 6; i++) {
      // walk forward through the steps that need no answer typing, checking the width on each
      const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(wide).toBeLessThanOrEqual(0)
      const cont = page.getByRole('button', { name: 'Continue' })
      if (!(await cont.count())) break
      await cont.click()
    }
  })
})

// C++ can't run on a phone (decision #57): each program's output is shown, and the server marks every answer.
test('a C++ lesson plays to the end with no runner', async ({ page }) => {
  test.setTimeout(300_000)
  await newPlayer(page)
  await page.goto('/academy')
  await page.getByRole('link', { name: /C\+\+ Basics/ }).click()
  await page.getByRole('link', { name: /1\.1 Your first program/ }).click()
  await playLesson(page, cpp.units[0].lessons[0].steps, { runs: false })
  await expect(page.getByText(/\+\d+ XP/)).toBeVisible()
})
