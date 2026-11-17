import { beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { normAnswer } from '../../src/features/academy/codeText'
import { lessonSteps, marked, rightStep, type Step } from './lessonAnswers'

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

/** A wrong answer of the right shape for each kind. */
function wrongStep(s: Step) {
  switch (s.kind) {
    case 'type':
      return { text: 'banana' }
    case 'match':
      return { pairs: s.pairs!.map(([l], i, all) => [l, all[(i + 1) % all.length][1]]) }
    case 'build':
      return { order: [...(s.answer as string[])].reverse() }
    default:
      return { choice: s.options!.find((o) => o.id !== s.answer)!.id }
  }
}

describe.skipIf(!url || !key)('language lessons (live project)', () => {
  let a: SupabaseClient
  let b: SupabaseClient
  beforeAll(async () => {
    a = await player()
    b = await player()
  })

  it('courses carry their kind', async () => {
    const { data } = await a.from('courses').select('id, kind')
    const kind = Object.fromEntries((data ?? []).map((c) => [c.id, c.kind]))
    expect(kind).toMatchObject({ 'python-basics': 'code', 'javascript-basics': 'code', 'english-basics': 'language', 'malay-basics': 'language' })
  })

  it('keys are not readable', async () => {
    const { data, error } = await a.rpc('start_lesson', { p_lesson: 'en-u1-l1' })
    expect(error).toBeNull()
    const text = JSON.stringify(data)
    expect(text).not.toMatch(/"(accept|answer|orders|explanation|solution)"/)
    const m = data.steps.find((s: { kind: string }) => s.kind === 'match')
    expect(Object.keys(m.pairs).sort()).toEqual(['left', 'right']) // two shuffled lists, not the pairs themselves
  })

  it('the server normalises answers like the app', async () => {
    for (const s of ['Selamat  pagi.', "I'm Aina!", '  Thank You ', 'Apa khabar?', '“Hello”']) {
      expect((await a.rpc('norm_answer', { p: s })).data).toBe(normAnswer(s))
    }
  })

  it('marks every language kind', async () => {
    const seenKinds = new Set<string>()
    for (const lesson of ['en-u1-l1', 'en-u1-l2']) {
      const { data: s } = await a.rpc('start_lesson', { p_lesson: lesson })
      for (const step of lessonSteps.get(lesson)!.filter((x) => x.kind !== 'card')) {
        await wait(1100)
        const wrong = await a.rpc('answer_lesson_step', { p_attempt: s.attempt_id, p_step: step.id, p_answer: wrongStep(step) })
        expect(wrong.error, step.id).toBeNull()
        expect(wrong.data.correct, `${step.id} wrong`).toBe(false)
        await wait(1100)
        const right = await a.rpc('answer_lesson_step', { p_attempt: s.attempt_id, p_step: step.id, p_answer: rightStep(step) })
        expect(right.data.correct, `${step.id} right`).toBe(true)
        seenKinds.add(step.kind)
      }
    }
    expect([...seenKinds].sort()).toEqual(['build', 'gap', 'listen', 'match', 'pick', 'type'])
  }, 120_000)

  it('typed slips are forgiven', async () => {
    const { data: s } = await b.rpc('start_lesson', { p_lesson: 'en-u1-l3' })
    const t = lessonSteps.get('en-u1-l3')!.find((x) => x.kind === 'type')!
    const sloppy = `  ${t.accept![0].toUpperCase().replace(' ', '  ')}.`
    expect((await b.rpc('answer_lesson_step', { p_attempt: s.attempt_id, p_step: t.id, p_answer: { text: sloppy } })).data.correct).toBe(true)
  })

  it('units unlock in order', async () => {
    expect((await b.rpc('start_lesson', { p_lesson: 'ms-u2-l1' })).error?.message).toMatch(/finish unit 1/i)
    expect((await b.rpc('start_lesson', { p_lesson: 'en-u3-l4' })).error?.message).toMatch(/finish unit 1/i)
  })

  it('listen is a bonus', async () => {
    const { data: s } = await b.rpc('start_lesson', { p_lesson: 'en-u1-l4' })
    expect(lessonSteps.get('en-u1-l4')!.some((x) => x.kind === 'listen')).toBe(true)
    for (const step of marked('en-u1-l4')) {
      await wait(1100)
      await b.rpc('answer_lesson_step', { p_attempt: s.attempt_id, p_step: step.id, p_answer: rightStep(step) })
    }
    const done = await b.rpc('complete_lesson', { p_attempt: s.attempt_id })
    expect(done.error).toBeNull()
    expect(done.data).toMatchObject({ first_time: true, xp: 25, gold: 10 })
  }, 60_000)
})
