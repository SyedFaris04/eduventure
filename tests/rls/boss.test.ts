import { beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import bank from '../../content/questions/starter.json'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
type Q = { id: string; type: string; subject: string; answer: unknown; options?: { id: string }[] }
const byId = new Map((bank.questions as Q[]).map((q) => [q.id, q]))
const right = (id: string) => {
  const q = byId.get(id)!
  if (q.type === 'mcq' || q.type === 'true_false') return { choice: q.answer }
  if (q.type === 'numeric') return { value: String((q.answer as { value: number }).value) }
  return { text: (q.answer as { accept: string[] }).accept[0] }
}
const wrong = (id: string) => {
  const q = byId.get(id)!
  if (q.type === 'mcq') return { choice: q.options!.find((o) => o.id !== q.answer)!.id }
  if (q.type === 'true_false') return { choice: q.answer === 'true' ? 'false' : 'true' }
  return q.type === 'numeric' ? { value: '-99999' } : { text: 'zzz' }
}

async function player() {
  const c = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await c.auth.signInAnonymously()
  if (error) throw error
  await c.rpc('set_birth_year', { p_year: 2000 })
  await c.from('academic_profiles').insert({ level_id: 'primary', country_code: 'MY', curriculum_id: 'international', language: 'en', subject_ids: ['mathematics'], goals: [], difficulty: 3 })
  return c
}

describe.skipIf(!url || !key)('Greenhaven Guardian boss (live project)', () => {
  let a: SupabaseClient
  let b: SupabaseClient
  beforeAll(async () => {
    a = await player()
    b = await player()
  })

  it('starts at round 1 with a maths question and no answer attached', async () => {
    const { data, error } = await a.rpc('start_boss')
    expect(error).toBeNull()
    expect(data).toMatchObject({ round: 1, rounds: 4, round_progress: 0, per_round: 3, hearts: 3, status: 'active' })
    expect(['mathematics', 'general_knowledge']).toContain(data.question.subject)
    expect(JSON.stringify(data)).not.toMatch(/"(answer|explanation|wrong)"/)
    expect((await a.rpc('start_boss')).data.run_id).toBe(data.run_id) // resumes
  })

  it("rejects answers to another player's run", async () => {
    const { data: s } = await a.rpc('start_boss')
    await wait(1600)
    const { error } = await b.rpc('answer_boss', { p_run: s.run_id, p_answer: right(s.question.id) })
    expect(error?.message).toMatch(/not found/i)
  })

  it('three wrong answers end the run without taking anything away', async () => {
    const { data: start } = await b.rpc('start_boss')
    const goldBefore = (await b.from('player_wallets').select('gold').single()).data!.gold
    let state = start
    for (let i = 0; i < 3; i++) {
      await wait(1600)
      const { data } = await b.rpc('answer_boss', { p_run: state.run_id, p_answer: wrong(state.question.id) })
      expect(data.correct).toBe(false)
      state = data.state
    }
    expect(state).toMatchObject({ hearts: 0, status: 'lost' })
    expect((await b.from('player_wallets').select('gold').single()).data!.gold).toBe(goldBefore)
  })

  it('12 correct answers clear all 4 rounds and pay the reward once per day', { timeout: 150_000 }, async () => {
    let { data: state } = await a.rpc('start_boss')
    const subjectsByRound: Record<number, string[]> = {}
    let reward = null
    for (let i = 0; i < 12; i++) {
      ;(subjectsByRound[state.round] ??= []).push(state.question.subject)
      await wait(1600)
      const { data, error } = await a.rpc('answer_boss', { p_run: state.run_id, p_answer: right(state.question.id) })
      expect(error).toBeNull()
      state = data.state
      reward = data.reward
    }
    expect(state.status).toBe('won')
    expect(reward).toMatchObject({ xp: 150, gold: 80, already_today: false })
    expect(subjectsByRound[2].every((s) => ['science', 'general_knowledge'].includes(s))).toBe(true)

    // A second win the same day is celebrated but pays nothing.
    ;({ data: state } = await a.rpc('start_boss'))
    for (let i = 0; i < 12; i++) {
      await wait(1600)
      const { data } = await a.rpc('answer_boss', { p_run: state.run_id, p_answer: right(state.question.id) })
      state = data.state
      reward = data.reward
    }
    expect(state.status).toBe('won')
    expect(reward).toMatchObject({ xp: 0, gold: 0, already_today: true })
  })
})
