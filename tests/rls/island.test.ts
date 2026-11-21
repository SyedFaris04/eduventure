import { beforeAll, describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Real Greenhaven nodes, read from the generated node list (materials come from slashing them).
const dir = new URL('../../supabase/migrations/', import.meta.url)
const nodesSql = readFileSync(new URL(readdirSync(dir).filter((f) => f.endsWith('_harvest_nodes.sql')).sort().at(-1)!, dir), 'utf8')
const nodes = (kind: string) =>
  [...nodesSql.matchAll(new RegExp(`\\('greenhaven', (\\d+), (\\d+), '${kind}'`, 'g'))].map((m) => ({ p_place: 'greenhaven', p_x: +m[1], p_y: +m[2] }))

type Item = { id: number; item: string; x: number; y: number; rot: number }
type Placed = { item: Item; materials: Record<string, number> }

describe.skipIf(!url || !key)('my island (live project)', () => {
  let a: SupabaseClient
  const place = (item: string, x: number, y: number, rot = 0) => a.rpc('place_island_item', { p_item: item, p_x: x, p_y: y, p_rot: rot })
  const island = async () => ((await a.rpc('my_island')).data ?? []) as Item[]
  async function slash(kind: string, n: number) {
    for (const node of nodes(kind).slice(0, n)) {
      await wait(1600)
      const { error } = await a.rpc('slash_harvest', node)
      expect(error).toBeNull()
    }
  }

  beforeAll(async () => {
    a = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error } = await a.auth.signInAnonymously()
    if (error) throw error
    await a.rpc('set_birth_year', { p_year: 2000 })
  })

  it('starts empty, and costs materials', async () => {
    expect(await island()).toEqual([])
    expect((await place('pond', 6, 6)).error?.message).toMatch(/Not enough/)
  })

  it('two placements at once with materials for one: only one goes through', async () => {
    await slash('herb', 2) // 4 herbs
    const [p1, p2] = await Promise.all([place('bush_round', 6, 6), place('bush_round', 10, 10)])
    expect([p1.error, p2.error].filter(Boolean)).toHaveLength(1)
    expect([p1.error?.message, p2.error?.message].join(' ')).toMatch(/Not enough/)
    expect(await island()).toHaveLength(1)
  }, 60_000)

  it('places, turns and moves within the build area, never overlapping', async () => {
    await slash('harvest_tree', 3) // 6 wood
    const fence = await place('fence_wood', 12, 12, 1)
    expect(fence.error).toBeNull()
    const placed = fence.data as Placed
    expect(placed.item).toMatchObject({ item: 'fence_wood', x: 12, y: 12, rot: 1 })
    expect(placed.materials.wood).toBe(3)
    const bush = (await island()).find((i) => i.item === 'bush_round')!
    // Onto the bush: refused, and nothing is charged.
    expect((await place('fence_wood', bush.x, bush.y)).error?.message).toMatch(/fit/)
    // Outside the build area (x 4–27, y 4–27).
    expect((await place('fence_wood', 2, 12)).error?.message).toMatch(/fit/)
    expect((await place('fence_wood', 27, 28)).error?.message).toMatch(/fit/)
    expect((await a.rpc('my_materials')).data.materials.wood).toBe(3)
    // Moving onto its own tiles shifted by one is fine; onto the bush is not.
    expect((await a.rpc('move_island_item', { p_id: placed.item.id, p_x: 12, p_y: 13, p_rot: 0 })).error).toBeNull()
    expect((await a.rpc('move_island_item', { p_id: placed.item.id, p_x: bush.x, p_y: bush.y, p_rot: 0 })).error?.message).toMatch(/fit/)
  }, 60_000)

  it('records what was paid (a refund gives that back even if prices change later)', async () => {
    const bush = (await a.rpc('my_island')).data.find((i: { item: string }) => i.item === 'bush_round')
    expect(bush.paid).toEqual({ herbs: 3 })
  })

  it("nobody can read the table directly or touch another player's items", async () => {
    const other = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })
    expect((await other.auth.signInAnonymously()).error).toBeNull()
    const mine = ((await a.rpc('my_island')).data as Item[])[0]
    expect((await other.rpc('move_island_item', { p_id: mine.id, p_x: 20, p_y: 20, p_rot: 0 })).error?.message).toMatch(/No such item/)
    expect((await other.rpc('remove_island_item', { p_id: mine.id })).error?.message).toMatch(/No such item/)
    const direct = await other.from('island_items').select('id')
    expect(direct.error !== null || (direct.data ?? []).length === 0).toBe(true)
    expect((await a.rpc('my_island')).data.some((i: Item) => i.id === mine.id)).toBe(true)
  })

  it('big items need their level', async () => {
    expect((await place('house_villa', 10, 10)).error?.message).toMatch(/level 10/i)
  })

  it('removing gives every material back', async () => {
    const fence = (await island()).find((i) => i.item === 'fence_wood')!
    const before = (await a.rpc('my_materials')).data.materials.wood
    const { data, error } = await a.rpc('remove_island_item', { p_id: fence.id })
    expect(error).toBeNull()
    expect(data.materials.wood).toBe(before + 3)
    expect((await island()).some((i) => i.id === fence.id)).toBe(false)
    expect((await a.rpc('remove_island_item', { p_id: fence.id })).error?.message).toMatch(/No such item/)
  })

  it('level-locked items are on the shared unlock list', async () => {
    const { data } = await a.from('level_unlocks').select('level, key').eq('kind', 'island_item')
    expect(data).toEqual(expect.arrayContaining([{ level: 10, key: 'house_villa' }, { level: 3, key: 'house_kampung' }]))
    const { data: cat } = await a.from('island_catalog').select('id, w, h, blocks').eq('id', 'house_pondok').single()
    expect(cat).toEqual({ id: 'house_pondok', w: 2, h: 2, blocks: true })
  })
})
