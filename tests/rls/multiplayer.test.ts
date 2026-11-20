import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_APPEARANCE } from '../../src/features/character/appearance'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const newClient = () => createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })

async function player(birthYear = 2000, name?: string) {
  const c = newClient()
  const { error } = await c.auth.signInAnonymously()
  if (error) throw error
  await c.rpc('set_birth_year', { p_year: birthYear })
  if (name) {
    const { error: e } = await c.from('characters').insert({ name, appearance: DEFAULT_APPEARANCE })
    if (e) throw e
  }
  return c
}

type Card = { public_id: string; visible: boolean; can_emote: boolean; banned: boolean; name: string | null; appearance: unknown; pet: unknown }
const card = async (c: SupabaseClient) => (await c.rpc('my_room_card')).data as Card
const visibility = async (c: SupabaseClient) => (await c.rpc('my_visibility')).data as { visible: boolean; reason: string | null }

// A blocked word with an o or e in it, written in leetspeak (o→0, e→3, s→5).
const words = readFileSync(new URL('../../content/blocked-words.txt', import.meta.url), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
const leet = words.find((w) => /[oe]/.test(w))!.replace(/o/g, '0').replace(/e/g, '3').replace(/s/g, '5')

describe.skipIf(!url || !key)('multiplayer: room cards and names', () => {
  let adult: SupabaseClient
  beforeAll(async () => {
    adult = await player(2000, 'Test Rider')
  })

  it('a room card shows the look and a random public id, never the account id', async () => {
    const uid = (await adult.auth.getUser()).data.user!.id
    const c = await card(adult)
    expect(c).toMatchObject({ visible: true, can_emote: true, banned: false, name: 'Test Rider' })
    expect(c.public_id).toMatch(/^[0-9a-f-]{36}$/)
    expect(c.public_id).not.toBe(uid)
    expect(JSON.stringify(c)).not.toContain(uid)
  })

  it('the word filter refuses a rude adult name, including leetspeak, and passes clean names', async () => {
    const other = await player(2000)
    const { error } = await other.from('characters').insert({ name: `${leet} x`.slice(0, 24), appearance: DEFAULT_APPEARANCE })
    expect(error?.message).toMatch(/different name/)
    expect((await other.rpc('name_ok', { p_name: 'Sunny Day' })).data).toBe(true)
    expect((await other.rpc('name_ok', { p_name: leet })).data).toBe(false)
  })

  it('an under-13 is hidden until a parent approves, and still has a card', async () => {
    const child = await player(new Date().getFullYear() - 9)
    expect((await card(child)).visible).toBe(false)
    expect(await visibility(child)).toEqual({ visible: false, reason: 'awaiting_parent' })
  })

  it('turning yourself off hides you, and players cannot unhide themselves or unban', async () => {
    const p = await player(2000, 'Quiet One')
    const uid = (await p.auth.getUser()).data.user!.id
    await p.from('user_privacy_settings').update({ visible_to_others: false }).eq('user_id', uid)
    expect(await visibility(p)).toEqual({ visible: false, reason: 'off' })
    await p.from('profiles').update({ multiplayer_banned: true }).eq('id', uid)
    await p.from('guardianships').insert({ child_id: uid, guardian_id: uid })
    expect(await card(p)).toMatchObject({ visible: false, banned: false })
    await p.from('user_privacy_settings').update({ visible_to_others: true }).eq('user_id', uid)
    expect(await visibility(p)).toEqual({ visible: true, reason: null })
  })
})
