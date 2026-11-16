import { beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import bank from '../../content/questions/starter.json'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
type Q = { id: string; type: string; answer: unknown; options?: { id: string }[]; topic: string; explanation: string }
const byId = new Map((bank.questions as Q[]).map((q) => [q.id, q]))
const wrong = (q: Q) =>
  q.type === 'mcq' ? { choice: q.options!.find((o) => o.id !== q.answer)!.id } : q.type === 'true_false' ? { choice: q.answer === 'true' ? 'false' : 'true' } : q.type === 'numeric' ? { value: '-99999' } : { text: 'zzz' }

describe.skipIf(!url || !key)('learning model (live project)', () => {
  let c: SupabaseClient
  let answered: Q

  beforeAll(async () => {
    c = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error } = await c.auth.signInAnonymously()
    if (error) throw error
    await c.rpc('set_birth_year', { p_year: 2000 })
    await c.from('academic_profiles').insert({ level_id: 'primary', country_code: 'MY', curriculum_id: 'international', language: 'en', subject_ids: ['mathematics'], goals: [], difficulty: 3 })
    const { data: s } = await c.rpc('start_encounter', { p_monster: 'dinobud' })
    answered = byId.get(s.question.id)!
    await wait(1600)
    await c.rpc('answer_question', { p_encounter: s.encounter_id, p_answer: wrong(answered) })
  })

  it('weights weak topics above strong ones (unknown topics in between)', async () => {
    const w = async (m: number | null) => (await c.rpc('question_weight', { p_mastery: m })).data as number
    const [weak, unknown, strong] = [await w(0.2), await w(null), await w(0.9)]
    expect(weak).toBeGreaterThan(unknown)
    expect(unknown).toBeGreaterThan(strong)
    expect(weak / strong).toBeLessThanOrEqual(3) // weak topics favoured, strong ones still appear
  })

  it('records accuracy-based mastery for the topic after an answer', async () => {
    const { data } = await c.from('topic_mastery').select('topic, attempts, correct, mastery').eq('topic', answered.topic).single()
    expect(data).toMatchObject({ topic: answered.topic, attempts: 1, correct: 0 })
    expect(Number(data!.mastery)).toBeCloseTo(1 / 3, 3)
  })

  it('the Academic Library lists answered questions with their explanation, and nothing else', async () => {
    const { data, error } = await c.rpc('my_library')
    expect(error).toBeNull()
    expect(data.map((r: { id: string }) => r.id)).toEqual([answered.id])
    expect(data[0].explanation).toBe(answered.explanation)
    expect(data[0].last_correct).toBe(false)
  })
})
