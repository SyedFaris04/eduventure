import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { UNLOCKS } from '../../src/game/unlocks'
import { rightAnswer as right, wrongAnswer as wrong } from './answers'

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

async function fleeAll(c: SupabaseClient) {
  const { data: e } = await c.from('encounters').select('id').eq('status', 'active')
  for (const r of e ?? []) await c.rpc('flee_encounter', { p_encounter: r.id })
}

describe.skipIf(!url || !key)('level unlocks (live project)', () => {
  let a: SupabaseClient
  let b: SupabaseClient
  beforeAll(async () => {
    a = await player()
    b = await player()
  })
  afterEach(async () => {
    await fleeAll(a)
    await fleeAll(b)
  })

  it('unlock list matches the client', async () => {
    const { data, error } = await a.from('level_unlocks').select('level, kind, key')
    expect(error).toBeNull()
    const sort = (r: { kind: string; key: string }[]) => [...r].sort((x, y) => `${x.kind}${x.key}`.localeCompare(`${y.kind}${y.key}`))
    expect(sort(data!)).toEqual(sort(UNLOCKS))
  })

  it('unlocked() semantics', async () => {
    const at = async (p_level: number, p_kind: string, p_key: string) => (await a.rpc('unlocked', { p_level, p_kind, p_key })).data
    expect(await at(7, 'helper', 'fifty')).toBe(false)
    expect(await at(8, 'helper', 'fifty')).toBe(true)
    expect(await at(1, 'shop_tier', 'common')).toBe(true)
    expect(await at(99, 'title', 'nonsense')).toBe(false)
  })

  it('fifty rules', async () => {
    const opts = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
    const { data: hidden } = await a.rpc('fifty_hidden', { p_type: 'mcq', p_options: opts, p_key: 'b' })
    expect(hidden).toHaveLength(2)
    expect(hidden).not.toContain('b')
    const ms = await a.rpc('fifty_hidden', { p_type: 'multi_select', p_options: opts, p_key: ['a', 'c'] })
    expect(ms.data).toHaveLength(2)
    expect(ms.data.sort()).toEqual(['b', 'd'])
    expect((await a.rpc('fifty_hidden', { p_type: 'true_false', p_options: null, p_key: 'true' })).data).toEqual([])

    const { data: s } = await a.rpc('start_encounter', { p_monster: 'sproutling' })
    expect(s.helpers).toEqual({ second_chance_left: false, fifty_used: false, hidden: [] })
    expect((await a.rpc('use_fifty', { p_encounter: s.encounter_id })).error?.message).toMatch(/level 8/i)
    expect((await b.rpc('use_fifty', { p_encounter: s.encounter_id })).error?.message).toMatch(/not found/i)
  })

  it('rare shop gate', async () => {
    const { error } = await a.rpc('buy_item', { p_item: 'wizard_hat' })
    expect(error?.message).toMatch(/level 5/i)
    const epic = await a.rpc('buy_item', { p_item: 'star_cloak' })
    expect(epic.error?.message).toMatch(/level 10/i)
    const common = await a.rpc('buy_item', { p_item: 'leaf_crown' }) // not level-gated: fails on gold instead
    expect(common.error?.message).toMatch(/gold/i)
  })

  it('owned rare item stays', async () => {
    // Wearing is still checked by ownership only (never by level), so items bought before the gate keep working.
    const { data: ch } = await a.from('characters').select('user_id').maybeSingle()
    if (!ch) return
    const { error } = await a.from('characters').update({ accessory: 'wizard_hat' }).eq('user_id', ch.user_id)
    expect(error?.message).toMatch(/do not own/i)
  })

  it('second chance at level 1 costs HP', async () => {
    const { data: s } = await a.rpc('start_encounter', { p_monster: 'sproutling' })
    await wait(1600)
    const { data: r } = await a.rpc('answer_question', { p_encounter: s.encounter_id, p_answer: wrong(s.question.id) })
    expect(r.second_chance).toBe(false)
    expect(r.state.player_hp).toBe(90)
    expect(r.state.helpers.second_chance_left).toBe(false)
  })

  it('titles', async () => {
    expect((await a.rpc('set_title', { p_key: 'kampung_hero' })).error?.message).toMatch(/level/i)
    expect((await a.rpc('set_title', { p_key: null })).error).toBeNull()
    expect((await a.rpc('my_title')).data).toBeNull()
  })

  it('second chance at level 3', { timeout: 240_000 }, async () => {
    const c = await player()
    let level = 1
    while (level < 3) {
      let { data: s } = await c.rpc('start_encounter', { p_monster: 'dinobud' })
      while (s.status === 'active') {
        await wait(1600)
        const { data: r, error } = await c.rpc('answer_question', { p_encounter: s.encounter_id, p_answer: right(s.question.id) })
        expect(error).toBeNull()
        level = r.totals.level
        s = r.state
      }
    }
    const { data: s } = await c.rpc('start_encounter', { p_monster: 'sproutling' })
    expect(s.helpers.second_chance_left).toBe(true)
    await wait(1600)
    const { data: r1 } = await c.rpc('answer_question', { p_encounter: s.encounter_id, p_answer: wrong(s.question.id) })
    expect(r1.second_chance).toBe(true)
    expect(r1.state.player_hp).toBe(100)
    expect(r1.state.helpers.second_chance_left).toBe(false)
    await wait(1600)
    const { data: r2 } = await c.rpc('answer_question', { p_encounter: s.encounter_id, p_answer: wrong(r1.state.question.id) })
    expect(r2.second_chance).toBe(false)
    expect(r2.state.player_hp).toBe(90)
    await fleeAll(c)
  })
})
