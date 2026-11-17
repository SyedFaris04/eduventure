import { beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { normCode } from '../../src/features/academy/codeText'
import { lessonSteps, marked, rightStep } from './lessonAnswers'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function player() {
  const c = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await c.auth.signInAnonymously()
  if (error) throw error
  await c.rpc('set_birth_year', { p_year: 2000 })
  return c
}

/** Answers every server-marked step of an attempt correctly (1.1 s apart, the server's minimum gap). */
async function answerAll(c: SupabaseClient, attempt: string, lesson: string) {
  for (const s of marked(lesson)) {
    await wait(1100)
    const { data, error } = await c.rpc('answer_lesson_step', { p_attempt: attempt, p_step: s.id, p_answer: rightStep(s) })
    expect(error, s.id).toBeNull()
    expect(data.correct, s.id).toBe(true)
  }
}

// Only two guest sign-ins: Supabase limits them per hour (decision #20).
describe.skipIf(!url || !key)('academy (live project)', () => {
  let a: SupabaseClient
  let b: SupabaseClient
  beforeAll(async () => {
    a = await player()
    b = await player()
  })

  it('answers are not readable', async () => {
    const keys = await a.from('lesson_step_keys').select('*')
    expect(keys.data ?? []).toEqual([])
    const { data, error } = await a.rpc('start_lesson', { p_lesson: 'py-u1-l1' })
    expect(error).toBeNull()
    expect(data.steps).toHaveLength(lessonSteps.get('py-u1-l1')!.length)
    expect(JSON.stringify(data)).not.toMatch(/"(accept|answer|answer_text|solution|explanation)"/)
  })

  it('players can list visible lessons and their public steps', async () => {
    const lessons = await a.from('lessons').select('id, course_id, unit_index, lesson_index, title')
    expect(lessons.error).toBeNull()
    expect(lessons.data!.map((l) => l.id)).toContain('py-u1-l1')
    const steps = await a.from('lesson_steps').select('*').eq('lesson_id', 'py-u1-l1')
    expect(steps.error).toBeNull()
    expect(steps.data).toHaveLength(lessonSteps.get('py-u1-l1')!.length)
    expect((await a.from('courses').select('id')).data!.map((c) => c.id).sort()).toEqual(['javascript-basics', 'python-basics'])
  })

  it('the server normalises code like the app does', async () => {
    for (const s of ['print( "Hi" )', 'x  =  1 + 2', 'x = "a b"', '  console.log("Hello " + friend);  ']) {
      const { data } = await a.rpc('norm_code', { p: s })
      expect(data).toBe(normCode(s))
    }
  })

  it('marks predict and fix', async () => {
    const { data: s } = await a.rpc('start_lesson', { p_lesson: 'py-u1-l1' })
    const [predict, , fix] = marked('py-u1-l1')
    const wrong = await a.rpc('answer_lesson_step', { p_attempt: s.attempt_id, p_step: predict.id, p_answer: { choice: 'b' } })
    expect(wrong.data).toMatchObject({ correct: false })
    expect(wrong.data.accepted ?? null).toBeNull() // not revealed after one wrong try
    expect((await a.rpc('answer_lesson_step', { p_attempt: s.attempt_id, p_step: predict.id, p_answer: { choice: 'a' } })).error?.message).toMatch(/too fast/i)
    await wait(1100)
    expect((await a.rpc('answer_lesson_step', { p_attempt: s.attempt_id, p_step: predict.id, p_answer: { choice: 'a' } })).data).toMatchObject({ correct: true, accepted: 'a' })
    await wait(1100)
    const spaced = `  ${fix.accept![0].replace('(', '( ').replace(')', ' )')}  `
    expect((await a.rpc('answer_lesson_step', { p_attempt: s.attempt_id, p_step: fix.id, p_answer: { line: spaced } })).data).toMatchObject({ correct: true })
  })

  it('complete_lesson refusals', async () => {
    const { data: s } = await a.rpc('start_lesson', { p_lesson: 'py-u1-l2' })
    expect((await a.rpc('complete_lesson', { p_attempt: s.attempt_id })).error?.message).toMatch(/answer every question/i)
    expect((await b.rpc('complete_lesson', { p_attempt: s.attempt_id })).error?.message).toMatch(/not found/i)
    expect((await b.rpc('answer_lesson_step', { p_attempt: s.attempt_id, p_step: marked('py-u1-l2')[0].id, p_answer: {} })).error?.message).toMatch(/not found/i)
  })

  it('first completion pays once', async () => {
    const before = (await a.from('player_xp').select('xp').single()).data!.xp
    const gold = (await a.from('player_wallets').select('gold').single()).data!.gold
    const { data: s } = await a.rpc('start_lesson', { p_lesson: 'py-u1-l1' }) // resumes the attempt from "marks predict and fix"
    await answerAll(a, s.attempt_id, 'py-u1-l1')
    const done = await a.rpc('complete_lesson', { p_attempt: s.attempt_id })
    expect(done.error).toBeNull()
    expect(done.data).toMatchObject({ first_time: true, xp: 25, gold: 10 })
    expect(Number(done.data.totals.xp)).toBe(Number(before) + 25)
    expect(Number(done.data.totals.gold)).toBe(Number(gold) + 10)
    expect((await a.rpc('my_course_progress', { p_course: 'python-basics' })).data).toContain('py-u1-l1')

    // The finished attempt is closed; a replay is a new attempt that pays nothing.
    await wait(1100)
    expect((await a.rpc('answer_lesson_step', { p_attempt: s.attempt_id, p_step: marked('py-u1-l1')[0].id, p_answer: { choice: 'a' } })).error?.message).toMatch(/ended/i)
    const { data: again } = await a.rpc('start_lesson', { p_lesson: 'py-u1-l1' })
    expect(again.attempt_id).not.toBe(s.attempt_id)
    await answerAll(a, again.attempt_id, 'py-u1-l1')
    expect((await a.rpc('complete_lesson', { p_attempt: again.attempt_id })).data).toMatchObject({ first_time: false, xp: 0, gold: 0 })
  }, 60_000)

  it('units unlock in order', async () => {
    expect((await b.rpc('start_lesson', { p_lesson: 'py-u2-l1' })).error?.message).toMatch(/finish unit 1/i)
    expect((await b.rpc('start_lesson', { p_lesson: 'js-u3-l4' })).error?.message).toMatch(/finish unit 1/i)
  })

  it('solution needs two tries', async () => {
    const { data: s } = await b.rpc('start_lesson', { p_lesson: 'py-u1-l3' })
    const write = lessonSteps.get('py-u1-l3')!.find((x) => x.kind === 'write')!
    expect((await b.rpc('lesson_solution', { p_attempt: s.attempt_id, p_step: write.id })).error?.message).toMatch(/try twice/i)
    await b.rpc('note_write_attempt', { p_attempt: s.attempt_id, p_step: write.id })
    await b.rpc('note_write_attempt', { p_attempt: s.attempt_id, p_step: write.id })
    expect((await b.rpc('lesson_solution', { p_attempt: s.attempt_id, p_step: write.id })).data).toBe(write.solution)
  })
})
