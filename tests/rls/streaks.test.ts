import { beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

const TODAY = '2026-11-18' // a Wednesday
const d = (n: number) => new Date(Date.parse(TODAY) - n * 86_400_000).toISOString().slice(0, 10)
const range = (from: number, to: number) => Array.from({ length: from - to + 1 }, (_, i) => d(from - i)) // d(from)..d(to)

// One guest sign-in: Supabase limits them per hour (decision #20).
describe.skipIf(!url || !key)('forgiving streaks (live project)', () => {
  let a: SupabaseClient
  beforeAll(async () => {
    a = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error } = await a.auth.signInAnonymously()
    if (error) throw error
    await a.rpc('set_birth_year', { p_year: 2000 })
  })

  const streak = async (days: string[]) => {
    const { data, error } = await a.rpc('streak_from_days', { p_days: days, p_today: TODAY })
    expect(error).toBeNull()
    return data
  }

  it('no days, one day, a week, two weeks', async () => {
    expect(await streak([])).toEqual({ current: 0, best: 0, shields: 0, rest_available: true, today_done: false })
    expect(await streak([TODAY])).toMatchObject({ current: 1, today_done: true })
    expect(await streak(range(7, 1))).toMatchObject({ current: 7, best: 7, shields: 1, rest_available: true, today_done: false })
    expect(await streak(range(13, 0))).toMatchObject({ current: 14, shields: 2 })
    expect(await streak(range(20, 0))).toMatchObject({ current: 21, shields: 2 }) // never more than two
  })

  it('a missed day uses the rest day, then a shield', async () => {
    // Played Mon 9 – Sun 15 (seven days: one shield), missed Mon 16 and Tue 17.
    expect(await streak(range(9, 3))).toMatchObject({ current: 7, shields: 0, rest_available: false })
    // Only three days played: no shield, so the second miss restarts the streak; the best is kept.
    expect(await streak(range(5, 3))).toMatchObject({ current: 0, best: 3 })
  })

  it('a long gap restarts the streak but keeps the best', async () => {
    expect(await streak([...range(69, 60), TODAY])).toMatchObject({ current: 1, best: 10 })
  })

  it('my_streak adds the week, the month and the view', async () => {
    const { data, error } = await a.rpc('my_streak')
    expect(error).toBeNull()
    expect(data.view).toBe('count')
    expect(data.week).toHaveLength(7)
    expect(data.month_days).toBeGreaterThanOrEqual(0)
    const { data: me } = await a.auth.getUser()
    expect((await a.from('user_settings').update({ streak_view: 'week' }).eq('user_id', me.user!.id)).error).toBeNull()
    expect((await a.rpc('my_streak')).data.view).toBe('week')
  })
})
