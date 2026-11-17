import { beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { petForm, petNext } from '../../src/features/pet/petRules'
import { FORM_CASES, NEXT_CASES } from '../../src/features/pet/petCases'
import { rightAnswer as right, wrongAnswer as wrong } from './answers'
import { lessonSteps, marked, rightStep } from './lessonAnswers'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function player() {
  const c = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await c.auth.signInAnonymously()
  if (error) throw error
  await c.rpc('set_birth_year', { p_year: 2000 })
  await c.from('academic_profiles').insert({ level_id: 'primary', country_code: 'MY', curriculum_id: 'international', language: 'en', subject_ids: ['mathematics'], goals: [], difficulty: 3 })
  return c
}

const pet = async (c: SupabaseClient) => (await c.from('player_pets').select('stage, points, branches, look').maybeSingle()).data

/** Answers right until `done` says stop; returns the last answer result. */
async function battle(c: SupabaseClient, monster: string, done: (r: { totals: { level: number }; xp_gained: number }) => boolean) {
  for (;;) {
    let { data: s } = await c.rpc('start_encounter', { p_monster: monster })
    while (s.status === 'active') {
      await wait(1600)
      const { data: r, error } = await c.rpc('answer_question', { p_encounter: s.encounter_id, p_answer: right(s.question.id) })
      expect(error).toBeNull()
      if (done(r)) {
        if (r.state.status === 'active') await c.rpc('flee_encounter', { p_encounter: s.encounter_id })
        return r
      }
      s = r.state
    }
  }
}

async function finishLesson(c: SupabaseClient, lesson: string) {
  const { data: s, error } = await c.rpc('start_lesson', { p_lesson: lesson })
  expect(error, lesson).toBeNull()
  for (const st of marked(lesson)) {
    await wait(1100)
    const r = await c.rpc('answer_lesson_step', { p_attempt: s.attempt_id, p_step: st.id, p_answer: rightStep(st) })
    expect(r.error, st.id).toBeNull()
  }
  const done = await c.rpc('complete_lesson', { p_attempt: s.attempt_id })
  expect(done.error, lesson).toBeNull()
  return done.data
}

// Two guest sign-ins only: Supabase limits them per hour (decision #20).
describe.skipIf(!url || !key)('knowledge pet (live project)', () => {
  let a: SupabaseClient
  let b: SupabaseClient
  beforeAll(async () => {
    a = await player()
    b = await player()
  })

  it('pet_form and pet_next match the client', async () => {
    for (const [branches, form] of FORM_CASES) {
      const { data, error } = await a.rpc('pet_form', { p_branches: branches })
      expect(error).toBeNull()
      expect(data, JSON.stringify(branches)).toBe(form)
      expect(petForm(branches)).toBe(form)
    }
    for (const [stage, points, level, gold] of NEXT_CASES) {
      const { data } = await a.rpc('pet_next', { p_stage: stage, p_points: points, p_level: level, p_gold: gold })
      expect(data, `${stage} ${points} ${level} ${gold}`).toEqual(petNext(stage, points, level, gold))
    }
  })

  it('level 1 cannot hatch; the row cannot be written by the player', async () => {
    expect((await a.rpc('hatch_pet', { p_species: 'kancil', p_name: 'comel' })).error?.message).toMatch(/reach level 2/i)
    expect((await a.rpc('evolve_pet')).error?.message).toMatch(/no pet yet/i)
    expect((await a.from('player_pets').insert({ species: 'naga', name: 'kiki' })).error).not.toBeNull()
    expect((await a.rpc('pet_award', { p_user: '00000000-0000-0000-0000-000000000000', p_branch: 'science', p_kind: 'lesson' })).error).not.toBeNull()
    expect(await pet(a)).toBeNull()
  })

  it('hatch, points, the daily cap, evolve gates and dressing', { timeout: 600_000 }, async () => {
    await battle(a, 'dinobud', (r) => r.totals.level >= 2)
    expect((await a.rpc('hatch_pet', { p_species: 'kancil', p_name: 'no such name' })).error?.message).toMatch(/unknown name/i)
    expect((await a.rpc('hatch_pet', { p_species: 'tiger', p_name: 'comel' })).error?.message).toMatch(/unknown species/i)
    const hatched = await a.rpc('hatch_pet', { p_species: 'kancil', p_name: 'comel' })
    expect(hatched.error).toBeNull()
    expect(hatched.data).toMatchObject({ species: 'kancil', name: 'comel', stage: 'baby', points: 0 })
    expect((await a.rpc('hatch_pet', { p_species: 'naga', p_name: 'kiki' })).error?.message).toMatch(/already have a pet/i)

    // Science Island: a right answer feeds the science branch; a wrong one changes nothing.
    const { data: s } = await a.rpc('start_encounter', { p_monster: 'hornbill' })
    await wait(1600)
    const r1 = await a.rpc('answer_question', { p_encounter: s.encounter_id, p_answer: right(s.question.id) })
    expect(r1.error).toBeNull()
    expect(await pet(a)).toMatchObject({ points: 1, branches: { science: 1, maths: 0 } })
    await wait(1600)
    await a.rpc('answer_question', { p_encounter: s.encounter_id, p_answer: wrong(r1.data.state.question.id) })
    expect((await pet(a))!.points).toBe(1)
    await a.rpc('flee_encounter', { p_encounter: s.encounter_id })

    // At most 30 points a day from answers; XP and gold carry on as normal.
    let points = 1
    await battle(a, 'dinobud', () => {
      points++
      return points >= 30
    })
    expect((await pet(a))!.points).toBe(30)
    await battle(a, 'dinobud', () => true)
    expect((await pet(a))!.points).toBe(30)

    expect((await a.rpc('evolve_pet')).error?.message).toMatch(/needs more pet points/i)

    expect((await a.rpc('dress_pet', { p_slot: 'neck', p_item: 'pet_bell' })).error?.message).toMatch(/do not own/i)
    expect((await a.rpc('buy_item', { p_item: 'pet_bell' })).error).toBeNull()
    expect((await a.rpc('dress_pet', { p_slot: 'neck', p_item: 'pet_bell' })).data).toEqual({ neck: 'pet_bell' })
    expect((await a.rpc('dress_pet', { p_slot: 'hat', p_item: 'pet_bell' })).error?.message).toMatch(/do not own/i)
    expect((await a.rpc('dress_pet', { p_slot: 'tail', p_item: null })).error).not.toBeNull()
    expect((await a.rpc('dress_pet', { p_slot: 'neck', p_item: null })).data).toEqual({})
    expect((await pet(a))!.look).toEqual({})
  })

  it('hatch after lessons only; a new lesson feeds the technology branch', { timeout: 600_000 }, async () => {
    const lessons = [...lessonSteps.keys()].filter((id) => id.startsWith('py-')).sort()
    let level = 1
    let i = 0
    while (level < 2) level = (await finishLesson(b, lessons[i++])).totals.level
    const hatched = await b.rpc('hatch_pet', { p_species: 'naga', p_name: 'kiki' })
    expect(hatched.error).toBeNull()
    expect(hatched.data.points).toBe(0) // today was already counted as a played day before the egg hatched
    await finishLesson(b, lessons[i])
    expect(await pet(b)).toMatchObject({ points: 5, branches: { technology: 5, language: 0 } })
    await finishLesson(b, lessons[i]) // a lesson only pays the pet the first time
    expect((await pet(b))!.points).toBe(5)
  })
})
