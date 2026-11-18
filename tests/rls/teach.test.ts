import { beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { lessonSteps, marked, rightStep } from './lessonAnswers'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const facts = JSON.parse(readFileSync(new URL('../../content/pet-facts.json', import.meta.url), 'utf8')).facts as { id: string }[]

async function finishLesson(c: SupabaseClient, lesson: string) {
  const { data: s, error } = await c.rpc('start_lesson', { p_lesson: lesson })
  expect(error, lesson).toBeNull()
  for (const st of marked(lesson)) {
    await wait(1100)
    expect((await c.rpc('answer_lesson_step', { p_attempt: s.attempt_id, p_step: st.id, p_answer: rightStep(st) })).error, st.id).toBeNull()
  }
  const done = await c.rpc('complete_lesson', { p_attempt: s.attempt_id })
  expect(done.error, lesson).toBeNull()
  return done.data
}

// One guest sign-in: Supabase limits them per hour (decision #20).
describe.skipIf(!url || !key)('teach your pet and adventures (live project)', () => {
  let a: SupabaseClient
  beforeAll(async () => {
    a = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error } = await a.auth.signInAnonymously()
    if (error) throw error
    await a.rpc('set_birth_year', { p_year: 2000 })
  })

  it('the pet guesses about one question in five, uniformly at random', async () => {
    const pick = async (type: string, options: unknown, roll: number, p: number) =>
      (await a.rpc('pet_guess_pick', { p_type: type, p_options: options, p_roll: roll, p_pick: p })).data
    const opts = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
    expect(await pick('mcq', opts, 0.5, 0.1)).toBeNull() // most questions: no guess
    expect(await pick('mcq', opts, 0.1, 0.0)).toBe('a')
    expect(await pick('mcq', opts, 0.1, 0.99)).toBe('d')
    expect(await pick('true_false', null, 0.1, 0.7)).toBe('true')
    expect(await pick('true_false', null, 0.1, 0.2)).toBe('false')
    expect(await pick('numeric', null, 0.1, 0.5)).toBeNull() // only choice questions
  })

  it('teaching is the player right and the pet wrong', async () => {
    const taught = async (guess: string | null, answer: string, correct: boolean) =>
      (await a.rpc('pet_taught', { p_guess: guess, p_answer: answer, p_correct: correct })).data
    expect(await taught('b', 'a', true)).toBe('taught')
    expect(await taught('a', 'a', true)).toBe('both')
    expect(await taught('b', 'a', false)).toBeNull()
    expect(await taught(null, 'a', true)).toBeNull()
  })

  it('every third new lesson sends the pet on an adventure', { timeout: 600_000 }, async () => {
    expect((await a.from('pet_facts').select('id')).data?.length).toBe(facts.length)
    const lessons = [...lessonSteps.keys()].filter((id) => id.startsWith('py-')).sort()
    let i = 0
    let level = 1
    while (level < 2) level = (await finishLesson(a, lessons[i++])).totals.level
    expect((await a.rpc('hatch_pet', { p_species: 'kancil', p_name: 'comel' })).error).toBeNull()
    expect((await a.rpc('my_adventure')).data).toMatchObject({ status: 'none' })
    await finishLesson(a, lessons[i++])
    await finishLesson(a, lessons[i++])
    expect((await a.rpc('my_adventure')).data.status).toBe('none')
    await finishLesson(a, lessons[i++])
    const away = (await a.rpc('my_adventure')).data
    expect(away.status).toBe('away')
    expect(new Date(away.returns_at).getTime() - Date.now()).toBeGreaterThan(5.5 * 3600_000)
    expect(['science_island', 'mathematics_mountains', 'technology_city', 'language_kingdom', 'greenhaven']).toContain(away.island)
    expect((await a.rpc('claim_souvenir')).error?.message).toMatch(/not back yet/i)
    expect((await a.rpc('my_souvenirs')).data).toEqual([])
  })

  it('adventure status and claiming follow the clock', async () => {
    const st = async (returns: string, claimed: string | null, now: string) => (await a.rpc('adventure_status', { p_returns_at: returns, p_claimed_at: claimed, p_now: now })).data
    expect(await st('2026-11-19T12:00:00Z', null, '2026-11-19T11:00:00Z')).toBe('away')
    expect(await st('2026-11-19T12:00:00Z', null, '2026-11-19T12:00:01Z')).toBe('back')
    expect(await st('2026-11-19T12:00:00Z', '2026-11-19T13:00:00Z', '2026-11-19T14:00:00Z')).toBe('none')
  })
})
