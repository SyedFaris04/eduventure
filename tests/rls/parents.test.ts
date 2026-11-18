import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
// The parent is the owner's admin account from .env.test.local (never committed); its link is removed at the end.
const parentEmail = process.env.TEST_ADMIN_EMAIL
const parentPassword = process.env.TEST_ADMIN_PASSWORD

const newClient = () => createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })
async function guest(year: number) {
  const c = newClient()
  const { error } = await c.auth.signInAnonymously()
  if (error) throw error
  await c.rpc('set_birth_year', { p_year: year })
  return c
}
const status = async (c: SupabaseClient) => (await c.rpc('my_guardian')).data

// Two guest sign-ins only: Supabase limits them per hour (decision #20).
describe.skipIf(!url || !key)('parent approval (live project)', () => {
  let adult: SupabaseClient
  let child: SupabaseClient
  let parent: SupabaseClient | null = null
  let childId = ''
  beforeAll(async () => {
    adult = await guest(2000)
    child = await guest(2014)
    childId = (await child.auth.getUser()).data.user!.id
    if (parentEmail && parentPassword) {
      parent = newClient()
      const { error } = await parent.auth.signInWithPassword({ email: parentEmail, password: parentPassword })
      if (error) throw error
    }
  })
  afterAll(async () => {
    if (parent && childId) await parent.rpc('remove_child', { p_child: childId })
  })

  it('play_left', async () => {
    const left = async (m: number, l: number | null) => (await adult.rpc('play_left', { p_minutes: m, p_limit: l })).data
    expect(await left(10, null)).toBeNull()
    expect(await left(29, 30)).toBe(1)
    expect(await left(31, 30)).toBe(0)
  })

  it('adults do not need a parent', async () => {
    expect((await status(adult)).status).toBe('not_needed')
    expect((await adult.rpc('request_guardian_code')).error?.message).toMatch(/only players under 18/i)
  })

  it('a child asks; a new code replaces the old one; guests cannot approve', async () => {
    expect((await status(child)).status).toBe('none')
    const first = (await child.rpc('request_guardian_code')).data
    expect(first.code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/)
    expect((await status(child))).toMatchObject({ status: 'pending', code: first.code })
    const second = (await child.rpc('request_guardian_code')).data
    expect(second.code).not.toBe(first.code)
    expect((await child.rpc('approve_child', { p_code: second.code, p_confirm: true })).error?.message).toMatch(/parent account/i)
    expect((await adult.rpc('approve_child', { p_code: second.code, p_confirm: true })).error?.message).toMatch(/parent account/i)
    if (parent) expect((await parent.rpc('approve_child', { p_code: first.code, p_confirm: true })).error?.message).toMatch(/not valid/i)
  })

  it.skipIf(!parentEmail)('a parent approves, sets a limit, reads the report and removes the link', async () => {
    const p = parent!
    const code = (await status(child)).code as string
    expect((await p.rpc('approve_child', { p_code: 'ZZZZ-ZZZZ', p_confirm: true })).error?.message).toMatch(/not valid/i)
    expect((await p.rpc('approve_child', { p_code: code, p_confirm: false })).error?.message).toMatch(/confirm/i)
    const ok = await p.rpc('approve_child', { p_code: code.replace('-', '').toLowerCase(), p_confirm: true })
    expect(ok.error).toBeNull()
    expect((await status(child)).status).toBe('approved')
    expect(((await p.rpc('my_children')).data as { child_id: string }[]).map((c) => c.child_id)).toContain(childId)
    expect((await child.rpc('request_guardian_code')).error?.message).toMatch(/already approved/i)

    expect((await p.rpc('set_child_limit', { p_child: childId, p_minutes: 45 })).error).not.toBeNull()
    expect((await p.rpc('set_child_limit', { p_child: childId, p_minutes: 30 })).error).toBeNull()
    expect(await status(child)).toMatchObject({ daily_limit: 30, minutes_left: 30 })
    await child.rpc('note_play')
    const again = (await child.rpc('note_play')).data
    expect(again.minutes_today).toBe(1)

    const report = (await p.rpc('child_report', { p_child: childId })).data
    expect(report.week).toHaveLength(7)
    expect(report.questions).toBeGreaterThanOrEqual(0)
    expect(Array.isArray(report.topics)).toBe(true)
    expect((await child.rpc('child_report', { p_child: childId })).error?.message).toMatch(/not your child/i)

    expect((await p.rpc('remove_child', { p_child: childId })).error).toBeNull()
    expect((await status(child)).status).toBe('none')
    expect(((await p.rpc('my_children')).data as { child_id: string }[]).map((c) => c.child_id)).not.toContain(childId)
  })
})
