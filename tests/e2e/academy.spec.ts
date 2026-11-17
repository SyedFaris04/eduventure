import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { newPlayer } from './helpers'

type Step = { kind: string; text: string; code?: string; options?: { id: string; text: string }[]; answer?: string; answer_text?: string; broken_line?: number; accept?: string[]; solution?: string; expected_output?: string }
const course = JSON.parse(readFileSync(new URL('../../content/courses/python-basics.json', import.meta.url), 'utf8')) as { units: { lessons: { id: string; steps: Step[] }[] }[] }
const lesson1 = course.units[0].lessons[0]

/** Replaces everything in the code editor (insertText skips CodeMirror's auto-closing brackets). */
async function setCode(page: Page, code: string) {
  const editor = page.getByLabel('Your code')
  await editor.click()
  await page.keyboard.press('Control+A')
  await page.keyboard.insertText(code)
}

/** Plays every step of a lesson like a learner who knows the answers. */
async function playLesson(page: Page, steps: Step[]) {
  for (const [i, s] of steps.entries()) {
    await expect(page.getByText(s.text)).toBeVisible({ timeout: 20_000 })
    const next = i === steps.length - 1 ? 'Finish lesson' : 'Continue'
    if (s.kind === 'learn') {
      await page.getByRole('button', { name: 'Run' }).click()
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
