import { beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { rightAnswer, wrongAnswer } from './answers'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const configured = Boolean(url && key)
const newClient = () => createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function player(level: string, subjects: string[], curriculum = 'international', grade: string | null = null) {
  const c = newClient()
  const { error } = await c.auth.signInAnonymously()
  if (error) throw error
  await c.rpc('set_birth_year', { p_year: 2000 })
  const res = await c.from('academic_profiles').insert({
    level_id: level, country_code: 'MY', curriculum_id: curriculum, grade_id: grade, language: 'en', subject_ids: subjects, goals: [], difficulty: 3,
  })
  if (res.error) throw res.error
  return c
}

describe.skipIf(!configured)('battles (live project)', () => {
  let a: SupabaseClient
  let b: SupabaseClient

  beforeAll(async () => {
    a = await player('primary', ['mathematics'])
    b = await player('primary', ['science'])
  })

  it('starts a battle without sending the answer', async () => {
    const { data, error } = await a.rpc('start_encounter', { p_monster: 'sproutling' })
    expect(error).toBeNull()
    expect(data.monster_hp).toBe(60)
    expect(data.player_hp).toBe(100)
    expect(data.question.id).toMatch(/^(pri|gen)-/)
    const text = JSON.stringify(data)
    for (const leak of ['answer', 'explanation', 'wrong', 'mistakes', 'accept']) expect(text).not.toContain(`"${leak}"`)
  })

  it('resumes the same battle instead of starting a second one', async () => {
    const first = await a.rpc('start_encounter', { p_monster: 'sproutling' })
    const again = await a.rpc('start_encounter', { p_monster: 'dinobud' })
    expect(again.data.encounter_id).toBe(first.data.encounter_id)
    expect(again.data.monster_id).toBe('sproutling')
  })

  it('two simultaneous starts (a double tap) both get the same battle', async () => {
    const c = await player('primary', ['english'])
    const results = await Promise.all(Array.from({ length: 6 }, () => c.rpc('start_encounter', { p_monster: 'pebblewing' })))
    expect(results.map((r) => r.error?.message ?? null)).toEqual(Array(6).fill(null))
    expect(new Set(results.map((r) => r.data.encounter_id)).size).toBe(1)
  })

  it('rejects an answer sent too quickly after the question appears', async () => {
    const { data: s } = await b.rpc('start_encounter', { p_monster: 'sproutling' })
    const { error } = await b.rpc('answer_question', { p_encounter: s.encounter_id, p_answer: rightAnswer(s.question.id) })
    expect(error?.message).toMatch(/Too fast/)
  })

  it('a correct answer damages the monster and pays XP and gold from the server', async () => {
    const { data: s } = await a.rpc('start_encounter', { p_monster: 'sproutling' })
    const before = (await a.from('player_xp').select('xp').single()).data!.xp
    await wait(1600)
    const { data, error } = await a.rpc('answer_question', { p_encounter: s.encounter_id, p_answer: rightAnswer(s.question.id) })
    expect(error).toBeNull()
    expect(data.correct).toBe(true)
    expect(data.damage).toBeGreaterThan(0)
    expect(data.state.monster_hp).toBe(60 - data.damage)
    expect(data.xp_gained).toBeGreaterThan(0)
    const after = (await a.from('player_xp').select('xp').single()).data!.xp
    expect(Number(after)).toBe(Number(before) + data.xp_gained)
  })

  it('a wrong answer explains the mistake, costs 10 HP and pays nothing', async () => {
    const { data: s } = await a.rpc('start_encounter', { p_monster: 'sproutling' })
    await wait(1600)
    const { data } = await a.rpc('answer_question', { p_encounter: s.encounter_id, p_answer: wrongAnswer(s.question.id) })
    expect(data.correct).toBe(false)
    expect(data.explanation.length).toBeGreaterThan(10)
    expect(data.xp_gained).toBe(0)
    expect(data.state.player_hp).toBe(s.player_hp - 10)
    expect(data.state.combo).toBe(0)
  })

  it("does not let a player answer someone else's battle", async () => {
    const { data: s } = await b.rpc('start_encounter', { p_monster: 'sproutling' })
    await wait(1600)
    const { error } = await a.rpc('answer_question', { p_encounter: s.encounter_id, p_answer: rightAnswer(s.question.id) })
    expect(error?.message).toMatch(/not found/)
  })

  it('rejects answers after fleeing', async () => {
    const { data: s } = await b.rpc('start_encounter', { p_monster: 'sproutling' })
    await b.rpc('flee_encounter', { p_encounter: s.encounter_id })
    await wait(1600)
    const { error } = await b.rpc('answer_question', { p_encounter: s.encounter_id, p_answer: rightAnswer(s.question.id) })
    expect(error?.message).toMatch(/already ended/)
  })

  it('keeps answer keys, the question bank and internal helpers out of reach', async () => {
    // Reviewers can read these (Phase 3); for players the rows simply do not exist.
    expect((await a.from('question_keys').select('*')).data ?? []).toEqual([])
    expect((await a.from('questions').select('*')).data ?? []).toEqual([])
    expect((await a.rpc('pick_question', { p_user: (await a.auth.getUser()).data.user!.id })).error).not.toBeNull()
    expect((await a.from('player_wallets').update({ gold: 9999 }).eq('gold', 0).select()).data ?? []).toEqual([])
  })

  it('a Doctoral player gets general questions, and a repeat within 24 h pays 0 XP', { timeout: 120_000 }, async () => {
    const c = await player('doctoral', ['research_methods'])
    const seen = new Set<string>()
    let repeat: { xp_gained: number; farmed: boolean } | null = null
    for (let i = 0; i < 14 && !repeat; i++) {
      const { data: s, error } = await c.rpc('start_encounter', { p_monster: 'dinobud' })
      expect(error).toBeNull()
      expect(s.question.id).toMatch(/^gen-/)
      await wait(1600)
      const { data } = await c.rpc('answer_question', { p_encounter: s.encounter_id, p_answer: rightAnswer(s.question.id) })
      if (seen.has(s.question.id)) repeat = data
      seen.add(s.question.id)
    }
    expect(repeat).not.toBeNull()
    expect(repeat!.farmed).toBe(true)
    // Only the monster-defeat bonus can still pay; the farmed question itself gives nothing.
    expect(repeat!.xp_gained).toBeLessThanOrEqual(50)
  })
})
