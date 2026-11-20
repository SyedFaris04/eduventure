import { beforeAll, describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
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

// Real Greenhaven nodes, read from the generated node list.
const dir = new URL('../../supabase/migrations/', import.meta.url)
const nodesSql = readFileSync(new URL(readdirSync(dir).filter((f) => f.endsWith('_harvest_nodes.sql')).sort().at(-1)!, dir), 'utf8')
const nodes = (kind: string) =>
  [...nodesSql.matchAll(new RegExp(`\\('greenhaven', (\\d+), (\\d+), '${kind}'`, 'g'))].map((m) => ({ p_place: 'greenhaven', p_x: +m[1], p_y: +m[2] }))

type Result = { correct: boolean; gained: number; material: string; materials: Record<string, number>; wrong_reason: string | null }

async function harvest(c: SupabaseClient, node: { p_place: string; p_x: number; p_y: number }, ok = true): Promise<Result> {
  const { data: s, error } = await c.rpc('start_harvest', node)
  expect(error).toBeNull()
  await wait(1600)
  const { data, error: e2 } = await c.rpc('answer_harvest', { p_answer: (ok ? right : wrong)(s.question.id) })
  expect(e2).toBeNull()
  return data
}

describe.skipIf(!url || !key)('harvesting and crafting', () => {
  let a: SupabaseClient
  beforeAll(async () => {
    a = await player()
  })

  it('only real nodes can be harvested, and crystal needs a pickaxe', async () => {
    expect((await a.rpc('start_harvest', { p_place: 'greenhaven', p_x: 0, p_y: 0 })).error?.message).toMatch(/Nothing to harvest/)
    expect((await a.rpc('start_harvest', nodes('crystal')[0])).error?.message).toMatch(/pickaxe/)
  })

  it('a right answer gives 2, a wrong one gives 1 with the reason, and the node regrows', async () => {
    const [t1, t2] = nodes('harvest_tree')
    const r = await harvest(a, t1)
    expect(r).toMatchObject({ correct: true, gained: 2, material: 'wood' })
    expect(r.materials.wood).toBe(2)
    expect((await a.rpc('start_harvest', t1)).error?.message).toMatch(/regrowing/)
    const { data: cd } = await a.rpc('my_harvest_cooldowns', { p_place: 'greenhaven' })
    expect(cd).toEqual([expect.objectContaining({ x: t1.p_x, y: t1.p_y })])
    const w = await harvest(a, t2, false)
    expect(w).toMatchObject({ correct: false, gained: 1 })
    expect(w.materials.wood).toBe(3)
  }, 30000)

  it('asking again for the same node keeps the same question, even when the asks overlap', async () => {
    const t = nodes('harvest_tree')[4]
    const [x, y] = await Promise.all([a.rpc('start_harvest', t), a.rpc('start_harvest', t)])
    expect(x.data.question.id).toBe(y.data.question.id)
    const { data: again } = await a.rpc('start_harvest', t)
    expect(again.question.id).toBe(x.data.question.id)
  })

  it('a node never pays twice, even when a new ask races the answer', async () => {
    let raced = 0
    for (const t of nodes('harvest_tree').slice(6, 10)) {
      const { data: s } = await a.rpc('start_harvest', t)
      await wait(1600)
      const [, again] = await Promise.all([a.rpc('answer_harvest', { p_answer: right(s.question.id) }), a.rpc('start_harvest', t)])
      if (again.error) continue // the ask came after the answer: refused as regrowing, as it should be
      raced++
      await wait(1600)
      const second = await a.rpc('answer_harvest', { p_answer: right(again.data.question.id) })
      expect(second.error?.message).toMatch(/regrowing/)
    }
    console.log('races hit:', raced)
  }, 60000)

  it('answering too fast is refused', async () => {
    const { data: s } = await a.rpc('start_harvest', nodes('harvest_tree')[2])
    const { error } = await a.rpc('answer_harvest', { p_answer: right(s.question.id) })
    expect(error?.message).toMatch(/Too fast/)
  })

  it('materials and tools cannot be written directly', async () => {
    await a.from('player_materials').insert({ material: 'crystal', amount: 99 })
    await a.from('player_tools').insert({ tool: 'crystal_pickaxe' })
    const { data } = await a.rpc('my_materials')
    expect(data.materials.crystal).toBe(0)
    expect(data.tools).toEqual([])
  })

  it('crafting spends materials, a tool adds to the yield, and crafting twice is refused', async () => {
    expect((await a.rpc('craft', { p_recipe: 'stone_axe' })).error?.message).toMatch(/Not enough/)
    const t = nodes('harvest_tree')
    const rocks = nodes('harvest_rock')
    await harvest(a, t[2]) // wood 5 or more
    for (const r of rocks.slice(0, 2)) await harvest(a, r) // stone 4
    const { data: before } = await a.rpc('my_materials')
    const { data, error } = await a.rpc('craft', { p_recipe: 'stone_axe' })
    expect(error).toBeNull()
    expect(data.tools).toEqual(['stone_axe'])
    expect(data.materials).toMatchObject({ wood: before.materials.wood - 4, stone: before.materials.stone - 3 })
    expect((await harvest(a, t[3])).gained).toBe(3)
    expect((await a.rpc('craft', { p_recipe: 'stone_axe' })).error?.message).toMatch(/already/)
  }, 60000)

  it('craft-only items are never sold in the shop', async () => {
    const { error } = await a.rpc('buy_item', { p_item: 'herb_crown' })
    expect(error?.message).toMatch(/crafted at a camp workbench/)
  })

  it('every island has four camp projects, and contributions are checked', async () => {
    const { data } = await a.rpc('camp_state', { p_place: 'science_island' })
    expect(data.map((p: { project: string }) => p.project)).toEqual(['camp_bench', 'camp_flag', 'camp_lantern', 'whiteboard'])
    expect((await a.rpc('contribute', { p_place: 'science_island', p_project: 'camp_bench', p_material: 'herbs', p_amount: 1 })).error?.message).toMatch(/does not need/)
    expect((await a.rpc('contribute', { p_place: 'science_island', p_project: 'camp_bench', p_material: 'wood', p_amount: 99 })).error?.message).toMatch(/Not enough/)
  })
})
