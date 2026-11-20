import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { newPlayer } from './helpers'

// Playwright doesn't load .env files: read the Supabase keys and the owner's admin account (the approving parent).
const env: Record<string, string> = {}
for (const f of ['.env.local', '.env.test.local']) {
  try {
    for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
      const m = /^([A-Z_]+)=(.*)$/.exec(line.trim())
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    // missing file: the test skips
  }
}
const ready = Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_PUBLISHABLE_KEY && env.TEST_ADMIN_EMAIL && env.TEST_ADMIN_PASSWORD)
const NAME = 'Board Tester'

test.skip(!ready, 'needs .env.local and .env.test.local')

test('a teen with an approving parent pins a note; a phone number is refused', async ({ page }) => {
  test.setTimeout(150_000)
  const admin = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await admin.auth.signInWithPassword({ email: env.TEST_ADMIN_EMAIL, password: env.TEST_ADMIN_PASSWORD })
  expect(error).toBeNull()
  try {
    await newPlayer(page, { year: String(new Date().getFullYear() - 15), name: NAME })
    await page.getByRole('button', { name: 'Ask my parent' }).click()
    const code = await page.locator('p.font-mono').innerText()
    expect((await admin.rpc('approve_child', { p_code: code, p_confirm: true })).error).toBeNull()

    await page.goto('/dev/board?place=qa_camp')
    const board = page.getByRole('dialog', { name: 'Camp board' })
    await expect(board.getByText("Today's question")).toBeVisible()
    const words = `Plants make oxygen ${Date.now().toString(36)}`
    await board.getByRole('button', { name: 'Idea' }).click()
    await board.getByLabel('Your words (optional)').fill(words)
    await board.getByRole('button', { name: 'Pin', exact: true }).click()
    await expect(board.getByRole('status')).toHaveText('Pinned!')
    await expect(board.getByRole('list').getByText(words)).toBeVisible()

    await board.getByLabel('Your words (optional)').fill('call me 0123456789')
    await board.getByRole('button', { name: 'Pin', exact: true }).click()
    await expect(board.getByRole('alert')).toHaveText("Phone numbers aren't allowed on boards.")
  } finally {
    const kids = ((await admin.rpc('my_children')).data ?? []) as { child_id: string; name: string | null }[]
    for (const k of kids.filter((k) => k.name === NAME)) await admin.rpc('remove_child', { p_child: k.child_id })
  }
})
