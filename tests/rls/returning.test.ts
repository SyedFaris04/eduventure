import { beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { byId, rightAnswer as right, wrongAnswer as wrong } from './answers'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const DAY = 86_400_000

async function player() {
  const c = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await c.auth.signInAnonymously()
  if (error) throw error
  await c.rpc('set_birth_year', { p_year: 2000 })
  await c.from('academic_profiles').insert({ level_id: 'primary', country_code: 'MY', curriculum_id: 'international', language: 'en', subject_ids: ['science'], goals: [], difficulty: 3 })
  return c
}

const missions = async (c: SupabaseClient) => (await c.rpc('my_missions')).data as { template_id: string; target: number; progress: number; completed: boolean }[]

// Two guest sign-ins only: Supabase limits them per hour (decision #20).
describe.skipIf(!url || !key)('returning monsters (live project)', () => {
  let a: SupabaseClient
  let b: SupabaseClient
  beforeAll(async () => {
    a = await player()
    b = await player()
  })

  it('next_review schedule', async () => {
    const t = new Date('2026-11-17T10:00:00Z')
    const at = (ms: number) => new Date(t.getTime() + ms).toISOString()
    const review = async (strength: number, due: string | null, correct: boolean) => {
      const { data, error } = await a.rpc('next_review', { p_strength: strength, p_due: due, p_correct: correct, p_now: t.toISOString() })
      expect(error).toBeNull()
      return { strength: Number(data.strength), due: new Date(data.due_at).toISOString() }
    }
    expect(await review(1, null, true)).toEqual({ strength: 2, due: at(2 * DAY) })
    expect(await review(2, at(-3_600_000), true)).toEqual({ strength: 4, due: at(4 * DAY) })
    expect(await review(32, at(-3_600_000), true)).toEqual({ strength: 60, due: at(60 * DAY) })
    expect(await review(4, at(DAY), true)).toEqual({ strength: 4, due: at(DAY) }) // not due yet: no change
    expect(await review(8, at(-3_600_000), false)).toEqual({ strength: 1, due: at(120_000) })
  })

  it('a fresh player has nothing returning', async () => {
    expect((await b.rpc('my_returning')).data).toEqual([])
    expect((await b.rpc('start_encounter', { p_monster: 'hornbill', p_returning: true })).error?.message).toMatch(/nothing is due/i)
    expect((await missions(b)).some((m) => m.template_id === 'd_returning_3')).toBe(false)
  })

  it('a mistake comes back as a Returning monster', { timeout: 600_000 }, async () => {
    const { data: s } = await a.rpc('start_encounter', { p_monster: 'hornbill' })
    const missed = byId.get(s.question.id)!
    await wait(1600)
    expect((await a.rpc('answer_question', { p_encounter: s.encounter_id, p_answer: wrong(s.question.id) })).error).toBeNull()
    const row = (await a.from('topic_mastery').select('strength_days, due_at').eq('subject_id', missed.subject).eq('topic', missed.topic).single()).data!
    expect(Number(row.strength_days)).toBe(1)
    expect(new Date(row.due_at).getTime() - Date.now()).toBeLessThan(3 * 60_000)

    // Another battle already running is returned unchanged.
    const again = (await a.rpc('start_encounter', { p_monster: 'hornbill', p_returning: true })).data
    expect(again.encounter_id).toBe(s.encounter_id)
    expect(again.returning).toBe(false)
    await a.rpc('flee_encounter', { p_encounter: s.encounter_id })

    await wait(125_000)
    expect((await a.rpc('my_returning')).data).toEqual([{ island_id: 'science_island', count: 1 }])
    expect((await missions(a)).find((m) => m.template_id === 'd_returning_3')).toMatchObject({ target: 1, progress: 0 })

    let { data: r } = await a.rpc('start_encounter', { p_monster: 'hornbill', p_returning: true })
    expect(r.returning).toBe(true)
    const first = byId.get(r.question.id)!
    expect([first.subject, first.topic]).toEqual([missed.subject, missed.topic])
    // Keep answering right: once the due topic is cleared the battle carries on with normal island questions.
    let last
    while (r.status === 'active') {
      await wait(1600)
      const res = await a.rpc('answer_question', { p_encounter: r.encounter_id, p_answer: right(r.question.id) })
      expect(res.error).toBeNull()
      last = res.data
      r = last.state
    }
    expect(r.status).toBe('won')
    expect(last.returning_bonus).toEqual({ xp: 20, gold: 10 })
    expect(last.missions_completed).toContain('d_returning_3')
    expect((await a.rpc('my_returning')).data).toEqual([])
  })
})
