import { beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { rightAnswer as right } from './answers'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
type Mission = { id: string; template_id: string; period: string; progress: number; target: number; completed: boolean; claimed: boolean }

describe.skipIf(!url || !key)('missions and streaks (live project)', () => {
  let c: SupabaseClient
  let other: SupabaseClient
  const missions = async () => (await c.rpc('my_missions')).data as Mission[]

  beforeAll(async () => {
    c = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })
    other = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })
    for (const x of [c, other]) {
      const { error } = await x.auth.signInAnonymously()
      if (error) throw error
      await x.rpc('set_birth_year', { p_year: 2000 })
      await x.from('academic_profiles').insert({ level_id: 'primary', country_code: 'MY', curriculum_id: 'international', language: 'en', subject_ids: ['mathematics'], goals: [], difficulty: 3 })
    }
  })

  it('gives every player 3 daily and 2 weekly missions, starting at zero', async () => {
    const m = await missions()
    expect(m.filter((x) => x.period === 'daily')).toHaveLength(3)
    expect(m.filter((x) => x.period === 'weekly')).toHaveLength(2)
    expect(m.every((x) => x.progress === 0 && !x.completed && !x.claimed)).toBe(true)
    expect((await missions()).map((x) => x.id)).toEqual(m.map((x) => x.id)) // asking again does not create more
  })

  it('cannot claim an unfinished mission or somebody else’s', async () => {
    const m = await missions()
    expect((await c.rpc('claim_mission', { p_id: m[0].id })).error?.message).toMatch(/not complete/i)
    expect((await other.rpc('claim_mission', { p_id: m[0].id })).error?.message).toMatch(/not found/i)
  })

  it('counts correct answers and defeated monsters on the server, then pays a claim exactly once', { timeout: 120_000 }, async () => {
    let completedSeen: string[] = []
    for (let i = 0; i < 16; i++) {
      const { data: s } = await c.rpc('start_encounter', { p_monster: 'sproutling' })
      await wait(1600)
      const { data } = await c.rpc('answer_question', { p_encounter: s.encounter_id, p_answer: right(s.question.id) })
      completedSeen = completedSeen.concat(data.missions_completed ?? [])
      const tenRight = (await missions()).find((x) => x.template_id === 'd_correct_10')!
      if (tenRight.completed) break
    }
    const m = await missions()
    const tenRight = m.find((x) => x.template_id === 'd_correct_10')!
    expect(tenRight).toMatchObject({ progress: 10, completed: true, claimed: false })
    expect(completedSeen).toContain('d_correct_10')
    expect(m.find((x) => x.template_id === 'd_defeat_3')!.progress).toBeGreaterThan(0)
    expect(m.find((x) => x.template_id === 'w_correct_50')!.progress).toBe(10)

    const before = (await c.from('player_wallets').select('gold').single()).data!.gold
    const claim = await c.rpc('claim_mission', { p_id: tenRight.id })
    expect(claim.error).toBeNull()
    const after = (await c.from('player_wallets').select('gold').single()).data!.gold
    expect(Number(after)).toBe(Number(before) + claim.data.gold)
    expect((await c.rpc('claim_mission', { p_id: tenRight.id })).error?.message).toMatch(/already claimed/i)
  })

  it('tracks a learning streak that started today', async () => {
    const { data } = await c.rpc('my_streak')
    expect(data).toMatchObject({ current: 1, today_done: true })
    const { data: fresh } = await other.rpc('my_streak')
    expect(fresh).toMatchObject({ current: 0, today_done: false })
  })

  it('rejects an invalid time zone', async () => {
    const { error } = await c.from('user_settings').update({ timezone: 'Mars/Olympus' }).eq('user_id', (await c.auth.getUser()).data.user!.id)
    expect(error?.message).toMatch(/time zone/i)
  })
})
