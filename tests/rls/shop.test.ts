import { beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { rightAnswer } from './answers'
import { CATALOGUE } from '../../src/features/shop/catalogue'
import { DEFAULT_APPEARANCE } from '../../src/features/character/appearance'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function player() {
  const c = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await c.auth.signInAnonymously()
  if (error) throw error
  await c.rpc('set_birth_year', { p_year: 2000 })
  await c.from('academic_profiles').insert({ level_id: 'primary', country_code: 'MY', curriculum_id: 'international', language: 'en', subject_ids: ['mathematics'], goals: [], difficulty: 3 })
  const { data: u } = await c.auth.getUser()
  const { error: e2 } = await c.from('characters').insert({ user_id: u.user!.id, name: 'Shopper', appearance: DEFAULT_APPEARANCE })
  if (e2) throw e2
  return c
}
const gold = async (c: SupabaseClient) => (await c.from('player_wallets').select('gold').single()).data!.gold as number
const owned = async (c: SupabaseClient) => ((await c.from('player_items').select('item_id')).data ?? []).map((r) => r.item_id as string)
const equip = (c: SupabaseClient, patch: Record<string, string>) => c.from('characters').update({ appearance: { ...DEFAULT_APPEARANCE, ...patch } }).not('user_id', 'is', null)

describe.skipIf(!url || !key)('shop and gear (live project)', () => {
  let poor: SupabaseClient
  let rich: SupabaseClient
  beforeAll(async () => {
    poor = await player()
    rich = await player()
  })

  it('the database catalogue matches the client catalogue exactly', async () => {
    const { data, error } = await poor.from('shop_items').select('id, slot, rarity, price, craft_only, festival_kind, token_price').order('id')
    expect(error).toBeNull()
    const client = [...CATALOGUE].map((i) => ({ id: i.id, slot: i.slot, rarity: i.rarity, price: i.price, craft_only: 'craft' in i, festival_kind: 'festival' in i ? i.festival : null, token_price: 'tokens' in i ? i.tokens : null })).sort((x, y) => x.id.localeCompare(y.id))
    expect(data).toEqual(client)
  })

  it('refuses a purchase without enough gold and leaves the wallet alone', async () => {
    expect(await gold(poor)).toBe(0)
    const { error } = await poor.rpc('buy_item', { p_item: 'leaf_crown' })
    expect(error?.message).toMatch(/not enough gold/i)
    expect(await gold(poor)).toBe(0)
    expect(await owned(poor)).toEqual([])
  })

  it('refuses unknown items', async () => {
    const { error } = await poor.rpc('buy_item', { p_item: 'no_such_item' })
    expect(error?.message).toMatch(/no such item/i)
  })

  it('players cannot grant themselves items, change prices or touch gold', async () => {
    const { data: u } = await poor.auth.getUser()
    expect((await poor.from('player_items').insert({ user_id: u.user!.id, item_id: 'star_cloak' })).error).not.toBeNull()
    await poor.from('shop_items').update({ price: 0 }).eq('id', 'star_cloak')
    expect((await poor.from('shop_items').select('price').eq('id', 'star_cloak').single()).data!.price).toBe(CATALOGUE.find((i) => i.id === 'star_cloak')!.price)
    await poor.from('player_wallets').update({ gold: 99999 }).not('user_id', 'is', null)
    expect(await gold(poor)).toBe(0)
    expect(await owned(poor)).toEqual([])
  })

  it('refuses equipping an item you do not own, even through the API', async () => {
    const { error } = await equip(poor, { accessory: 'leaf_crown' })
    expect(error?.message).toMatch(/do not own/i)
    expect((await equip(poor, { accessory: 'glasses' })).error).toBeNull() // free options still work
  })

  it('gold earned from the boss buys the Leaf Crown once, and it can then be worn', { timeout: 120_000 }, async () => {
    let { data: state } = await rich.rpc('start_boss')
    for (let i = 0; i < 12; i++) {
      await wait(1600)
      const { data, error } = await rich.rpc('answer_boss', { p_run: state.run_id, p_answer: rightAnswer(state.question.id) })
      expect(error).toBeNull()
      state = data.state
    }
    expect(await gold(rich)).toBe(80)

    const { data, error } = await rich.rpc('buy_item', { p_item: 'leaf_crown' })
    expect(error).toBeNull()
    expect(data).toMatchObject({ item_id: 'leaf_crown', gold: 0 })
    expect(await gold(rich)).toBe(0)
    expect(await owned(rich)).toEqual(['leaf_crown'])

    expect((await rich.rpc('buy_item', { p_item: 'leaf_crown' })).error?.message).toMatch(/already own/i)
    expect((await equip(rich, { accessory: 'leaf_crown' })).error).toBeNull()
    expect((await rich.from('characters').select('appearance').single()).data!.appearance.accessory).toBe('leaf_crown')
  })
})
