import { beforeAll, describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Real Greenhaven nodes, read from the generated node list.
const dir = new URL('../../supabase/migrations/', import.meta.url)
const nodesSql = readFileSync(new URL(readdirSync(dir).filter((f) => f.endsWith('_harvest_nodes.sql')).sort().at(-1)!, dir), 'utf8')
const nodes = (kind: string) =>
  [...nodesSql.matchAll(new RegExp(`\\('greenhaven', (\\d+), (\\d+), '${kind}'`, 'g'))].map((m) => ({ p_place: 'greenhaven', p_x: +m[1], p_y: +m[2] }))

type Slash = { material: string; gained: number; materials: Record<string, number>; missions_completed: string[] }

describe.skipIf(!url || !key)('harvesting by slashing (no question)', () => {
  let a: SupabaseClient
  beforeAll(async () => {
    a = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error } = await a.auth.signInAnonymously()
    if (error) throw error
    await a.rpc('set_birth_year', { p_year: 2000 })
  })

  it('a tree gives 2 wood, then regrows', async () => {
    const tree = nodes('harvest_tree')[0]
    const { data, error } = await a.rpc('slash_harvest', tree)
    expect(error).toBeNull()
    expect(data as Slash).toMatchObject({ material: 'wood', gained: 2 })
    expect((data as Slash).materials.wood).toBe(2)
    expect((await a.rpc('slash_harvest', tree)).error?.message).toMatch(/Still regrowing/)
  })

  it('one completed harvest every 1.5 seconds at most, so a script cannot farm', async () => {
    const [r1, r2] = nodes('harvest_rock')
    await wait(1600)
    expect((await a.rpc('slash_harvest', r1)).error).toBeNull()
    expect((await a.rpc('slash_harvest', r2)).error?.message).toMatch(/Too fast/)
    await wait(1600)
    const { data, error } = await a.rpc('slash_harvest', r2)
    expect(error).toBeNull()
    expect(data as Slash).toMatchObject({ material: 'stone', gained: 2 })
  })

  it('crystal needs a pickaxe, and made-up nodes give nothing', async () => {
    await wait(1600)
    expect((await a.rpc('slash_harvest', nodes('crystal')[0])).error?.message).toMatch(/pickaxe/)
    expect((await a.rpc('slash_harvest', { p_place: 'greenhaven', p_x: 0, p_y: 0 })).error?.message).toMatch(/Nothing to harvest/)
  })

  it('crafting costs more now that materials come faster', async () => {
    const { data } = await a.from('recipes').select('id, cost').eq('id', 'stone_axe').single()
    expect(data?.cost).toEqual({ wood: 6, stone: 5 })
  })
})
