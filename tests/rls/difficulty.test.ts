import { beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { byId, rightAnswer as right } from './answers'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

// One guest sign-in: Supabase limits them per hour (decision #20).
describe.skipIf(!url || !key)('adaptive difficulty (live project)', () => {
  let a: SupabaseClient
  beforeAll(async () => {
    a = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error } = await a.auth.signInAnonymously()
    if (error) throw error
    await a.rpc('set_birth_year', { p_year: 2000 })
    await a.from('academic_profiles').insert({ level_id: 'primary', country_code: 'MY', curriculum_id: 'international', language: 'en', subject_ids: ['science'], goals: [], difficulty: 3 })
  })
  const num = async (fn: string, args: object) => Number((await a.rpc(fn, args)).data)

  it('the rating maths', async () => {
    expect(await num('elo_p', { p_theta: 0, p_beta: 0 })).toBeCloseTo(0.5, 6)
    expect(await num('elo_p', { p_theta: 1, p_beta: 0 })).toBeCloseTo(0.7311, 3)
    expect(await num('elo_k', { p_n: 0, p_a: 1.8 })).toBeCloseTo(1.8, 6)
    expect(await num('elo_k', { p_n: 20, p_a: 1.8 })).toBeCloseTo(0.9, 6)
    expect(await num('difficulty_fit', { p_p: 0.775, p_target: 0.775 })).toBeCloseTo(1, 6)
    expect(await num('difficulty_fit', { p_p: 0.5, p_target: 0.775 })).toBeCloseTo(0.0724, 3)
    expect(await num('base_rating', { p_difficulty: 1 })).toBeCloseTo(-1, 6)
    expect(await num('base_rating', { p_difficulty: 5 })).toBeCloseTo(1, 6)
  })

  it('targets: Returning easier, bosses harder, younger players a little easier', async () => {
    const target = (kind: string, young: boolean) => num('pick_target', { p_kind: kind, p_young: young })
    expect(await target('normal', false)).toBeCloseTo(0.775, 6)
    expect(await target('returning', false)).toBeCloseTo(0.875, 6)
    expect(await target('boss', false)).toBeCloseTo(0.625, 6)
    expect(await target('normal', true)).toBeCloseTo(0.85, 6)
    expect(await target('returning', true)).toBeCloseTo(0.9, 6)
    expect(await target('boss', true)).toBeCloseTo(0.625, 6)
  })

  it('a right answer raises the player and lowers the question', async () => {
    const { data: s } = await a.rpc('start_encounter', { p_monster: 'sproutling' })
    const q = byId.get(s.question.id)!
    const before = (await a.from('question_ratings').select('rating, answers').eq('question_id', q.id).maybeSingle()).data
    await wait(1600)
    expect((await a.rpc('answer_question', { p_encounter: s.encounter_id, p_answer: right(q.id) })).error).toBeNull()
    const skill = (await a.from('player_skill').select('rating, answers').eq('subject_id', q.subject).single()).data!
    expect(skill.answers).toBe(1)
    expect(Number(skill.rating)).toBeGreaterThan(0)
    const after = (await a.from('question_ratings').select('rating, answers').eq('question_id', q.id).single()).data!
    expect(after.answers).toBe((before?.answers ?? 0) + 1)
    const base = before ? Number(before.rating) : await num('base_rating', { p_difficulty: (q as unknown as { difficulty: number }).difficulty })
    expect(Number(after.rating)).toBeLessThan(base)
    await a.rpc('flee_encounter', { p_encounter: s.encounter_id })
  })

  it('ratings cannot be written by players', async () => {
    expect((await a.from('player_skill').insert({ subject_id: 'science', rating: 99 })).error).not.toBeNull()
    expect((await a.from('question_ratings').update({ rating: -99 }).eq('question_id', 'x')).error).not.toBeNull()
    expect((await a.rpc('rate_attempt')).error).not.toBeNull()
  })
})
