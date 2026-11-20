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

const adminEmail = process.env.TEST_ADMIN_EMAIL
const adminPassword = process.env.TEST_ADMIN_PASSWORD

describe.skipIf(!url || !key)('multiplayer: blocks, reports and moderation', () => {
  let me: SupabaseClient
  let them: SupabaseClient
  let theirId: string
  beforeAll(async () => {
    me = await player(2000, 'Block Tester')
    them = await player(2000, 'Some Rider')
    theirId = (await card(them)).public_id
  })

  it('blocking is private and reversible', async () => {
    expect((await me.rpc('block_player', { p_public_id: theirId })).error).toBeNull()
    expect((await me.rpc('my_blocks')).data).toContain(theirId)
    await me.rpc('unblock_player', { p_public_id: theirId })
    expect((await me.rpc('my_blocks')).data).not.toContain(theirId)
    expect((await me.rpc('block_player', { p_public_id: (await card(me)).public_id })).error?.message).toMatch(/yourself/)
  })

  it('reports need a real player, never yourself, and are limited', async () => {
    const mine = (await card(me)).public_id
    expect((await me.rpc('report_player', { p_public_id: mine, p_reason: 'other', p_place: 'greenhaven' })).error?.message).toMatch(/yourself/)
    expect((await me.rpc('report_player', { p_public_id: crypto.randomUUID(), p_reason: 'other', p_place: 'greenhaven' })).error?.message).toMatch(/No such player/)
    for (let i = 0; i < 10; i++) expect((await me.rpc('report_player', { p_public_id: theirId, p_reason: 'rude_name', p_place: 'greenhaven' })).error).toBeNull()
    expect((await me.rpc('report_player', { p_public_id: theirId, p_reason: 'rude_name', p_place: 'greenhaven' })).error?.message).toMatch(/Too many/)
  })

  it("players cannot see reports, ban, or switch someone else's child", async () => {
    expect((await me.rpc('open_reports')).error).not.toBeNull()
    expect((await me.rpc('ban_from_multiplayer', { p_public_id: theirId, p_banned: true })).error).not.toBeNull()
    const theirUid = (await them.auth.getUser()).data.user!.id
    expect((await me.rpc('set_child_visible', { p_child: theirUid, p_visible: false })).error).not.toBeNull()
    expect((await card(them)).banned).toBe(false)
  })

  it.skipIf(!adminEmail || !adminPassword)('a moderator ban shows on the card and closes the reports', async () => {
    const admin = newClient()
    const { error } = await admin.auth.signInWithPassword({ email: adminEmail!, password: adminPassword! })
    if (error) throw error
    const listed = ((await admin.rpc('open_reports')).data as { reported_public_id: string; open_count: number }[]).find((r) => r.reported_public_id === theirId)
    expect(listed?.open_count).toBe(10)
    expect((await admin.rpc('ban_from_multiplayer', { p_public_id: theirId, p_banned: true })).error).toBeNull()
    expect(await card(them)).toMatchObject({ banned: true, visible: false })
    expect(((await admin.rpc('open_reports')).data as { reported_public_id: string }[]).some((r) => r.reported_public_id === theirId)).toBe(false)
    await admin.rpc('ban_from_multiplayer', { p_public_id: theirId, p_banned: false })
    expect((await card(them)).banned).toBe(false)
  })
})
