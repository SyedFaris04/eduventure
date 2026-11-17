import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

const SCIENCE = ['science', 'biology', 'chemistry', 'physics', 'environmental_science']
const MATHS = ['mathematics', 'additional_mathematics', 'calculus', 'statistics']

async function player(level = 'primary', subjects = ['mathematics']) {
  const c = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await c.auth.signInAnonymously()
  if (error) throw error
  await c.rpc('set_birth_year', { p_year: 2000 })
  const { error: e2 } = await c.from('academic_profiles').insert({ level_id: level, country_code: 'MY', curriculum_id: 'international', language: 'en', subject_ids: subjects, goals: [], difficulty: 3 })
  if (e2) throw e2
  return c
}

async function fleeAll(c: SupabaseClient) {
  const { data: e } = await c.from('encounters').select('id').eq('status', 'active')
  for (const r of e ?? []) await c.rpc('flee_encounter', { p_encounter: r.id })
  const { data: b } = await c.from('boss_runs').select('id').eq('status', 'active')
  for (const r of b ?? []) await c.rpc('flee_boss', { p_run: r.id })
}

describe.skipIf(!url || !key)('islands (live project)', () => {
  let a: SupabaseClient
  beforeAll(async () => {
    a = await player()
  })
  afterEach(() => fleeAll(a))

  it('islands readable', async () => {
    const { data, error } = await a.from('islands').select('id, subject_ids').order('sort')
    expect(error).toBeNull()
    expect(data).toEqual([
      { id: 'greenhaven', subject_ids: null },
      { id: 'science_island', subject_ids: SCIENCE },
      { id: 'mathematics_mountains', subject_ids: MATHS },
      { id: 'technology_city', subject_ids: ['programming', 'computer_science', 'artificial_intelligence', 'cybersecurity'] },
    ])
  })

  it('monsters belong to islands', async () => {
    const { data } = await a.from('monsters').select('id, island_id, max_hp, xp_reward, gold_reward')
    const byId = Object.fromEntries((data ?? []).map((m) => [m.id, m]))
    for (const id of ['sproutling', 'pebblewing', 'dinobud']) expect(byId[id].island_id).toBe('greenhaven')
    expect(byId.hornbill).toMatchObject({ island_id: 'science_island', max_hp: 100, xp_reward: 40, gold_reward: 16 })
    expect(byId.tapir).toMatchObject({ island_id: 'science_island', max_hp: 120, xp_reward: 48, gold_reward: 19 })
    expect(byId.pangolin).toMatchObject({ island_id: 'science_island', max_hp: 130, xp_reward: 55, gold_reward: 22 })
    expect(byId.cubelet).toMatchObject({ island_id: 'mathematics_mountains', max_hp: 100 })
    expect(byId.hexowl).toMatchObject({ island_id: 'mathematics_mountains', max_hp: 120 })
    expect(byId.pisnake).toMatchObject({ island_id: 'mathematics_mountains', max_hp: 130 })
  })

  it('island monsters ask island subjects', async () => {
    const { data, error } = await a.rpc('start_encounter', { p_monster: 'hornbill' })
    expect(error).toBeNull()
    expect(data.monster_id).toBe('hornbill')
    expect(SCIENCE).toContain(data.question.subject) // the player only picked mathematics
  })

  it('greenhaven unchanged', async () => {
    const { data, error } = await a.rpc('start_encounter', { p_monster: 'sproutling' })
    expect(error).toBeNull()
    expect(typeof data.question.subject).toBe('string')
  })

  it('island fallback', async () => {
    // A level and subject with few or no island questions: an island battle starts whenever a Greenhaven one does.
    const c = await player('doctoral', ['history'])
    const home = await c.rpc('start_encounter', { p_monster: 'sproutling' })
    await fleeAll(c)
    const island = await c.rpc('start_encounter', { p_monster: 'pangolin' })
    expect(island.error === null).toBe(home.error === null)
    await fleeAll(c)
  })

  it('technology city monsters ask programming questions', async () => {
    const { data, error } = await a.rpc('start_encounter', { p_monster: 'bytebot' })
    expect(error).toBeNull()
    expect(['programming', 'computer_science', 'artificial_intelligence', 'cybersecurity']).toContain(data.question.subject)
    expect((await a.rpc('start_boss', { p_boss: 'glitch_golem' })).error?.message).toMatch(/level 5/i)
  })

  it('island boss gate', async () => {
    const gated = await a.rpc('start_boss', { p_boss: 'raja_rafflesia' })
    expect(gated.error?.message).toMatch(/level 5/i)
    const guardian = await a.rpc('start_boss', {})
    expect(guardian.error).toBeNull()
    expect(guardian.data.boss_id).toBe('guardian')
    expect((await a.rpc('start_boss', { p_boss: 'nobody' })).error).not.toBeNull()
  })
})
