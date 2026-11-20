import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { rightAnswer } from './answers'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
// The owner's admin account (in .env.test.local, never committed). Previews only ever touch this account's own progress.
const adminEmail = process.env.TEST_ADMIN_EMAIL
const adminPassword = process.env.TEST_ADMIN_PASSWORD
const newClient = () => createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })

async function player() {
  const c = newClient()
  const { error } = await c.auth.signInAnonymously()
  if (error) throw error
  await c.rpc('set_birth_year', { p_year: 2000 })
  await c.from('academic_profiles').insert({ level_id: 'primary', country_code: 'MY', curriculum_id: 'international', language: 'en', subject_ids: ['mathematics'], goals: [], difficulty: 3 })
  return c
}

type Festival = { id: string; kind: string; starts_on: string; ends_on: string; preview: boolean }
type Festivals = { festivals: Festival[]; tokens: number }
type Mission = { id: string; template_id: string; period: string; festival: string | null; tokens: number; ends_on: string | null; progress: number; target: number; completed: boolean; claimed: boolean }
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Real Greenhaven trees and rocks (no pickaxe needed), read from the generated node list.
const dir = new URL('../../supabase/migrations/', import.meta.url)
const nodesSql = readFileSync(new URL(readdirSync(dir).filter((f) => f.endsWith('_harvest_nodes.sql')).sort().at(-1)!, dir), 'utf8')
const greenNodes = [...nodesSql.matchAll(/\('greenhaven', (\d+), (\d+), 'harvest_(tree|rock)'/g)].map((m) => ({ p_place: 'greenhaven', p_x: +m[1], p_y: +m[2] }))

/** Harvests n ready Greenhaven nodes with right answers (each answer also counts as a right answer for missions). */
async function harvestRight(c: SupabaseClient, n: number) {
  const { data: cd } = await c.rpc('my_harvest_cooldowns', { p_place: 'greenhaven' })
  const busy = new Set(((cd ?? []) as { x: number; y: number }[]).map((r) => `${r.x},${r.y}`))
  const ready = greenNodes.filter((t) => !busy.has(`${t.p_x},${t.p_y}`))
  expect(ready.length).toBeGreaterThanOrEqual(n)
  for (const t of ready.slice(0, n)) {
    const { data: s, error } = await c.rpc('start_harvest', t)
    expect(error).toBeNull()
    await wait(1600)
    const { error: e2 } = await c.rpc('answer_harvest', { p_answer: rightAnswer(s.question.id) })
    expect(e2).toBeNull()
  }
}

const todayKL = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date())

describe.skipIf(!url || !key)('festivals: players', () => {
  let a: SupabaseClient
  beforeAll(async () => {
    a = await player()
  })

  it('lists the festivals on now in Malaysia time, with tokens', async () => {
    const { data, error } = await a.rpc('my_festivals')
    expect(error).toBeNull()
    const f = data as Festivals
    expect(f.tokens).toBe(0)
    for (const x of f.festivals) {
      expect(x.starts_on <= todayKL() && todayKL() <= x.ends_on).toBe(true)
      expect(x.preview).toBe(false)
    }
  })

  it('festival dates, tokens and previews cannot be written by players', async () => {
    await a.from('festivals').insert({ id: 'fake_2026', kind: 'cny', starts_on: '2026-01-01', ends_on: '2030-01-01' })
    await a.from('player_wallets').update({ festival_tokens: 999 }).neq('gold', -1)
    await a.from('festival_previews').insert({ user_id: (await a.auth.getUser()).data.user!.id, festival_id: 'cny_2027' })
    const { data } = await a.rpc('my_festivals')
    expect((data as Festivals).tokens).toBe(0)
    expect((data as Festivals).festivals.some((x) => x.id === 'fake_2026' || x.preview)).toBe(false)
  })

  it('festival missions appear only for festivals that are on', async () => {
    const { data: f } = await a.rpc('my_festivals')
    const { data: m } = await a.rpc('my_missions')
    const kinds = new Set((m as Mission[]).filter((x) => x.festival).map((x) => x.festival))
    expect(kinds).toEqual(new Set((f as Festivals).festivals.map((x) => x.kind)))
  })

  it('the stall refuses when the festival is off, and the gold shop never sells festival items', async () => {
    const on = new Set(((await a.rpc('my_festivals')).data as Festivals).festivals.map((x) => x.kind))
    const item = on.has('deepavali') ? 'pet_bunting' : 'pet_marigold'
    expect((await a.rpc('buy_festival_item', { p_item: item })).error?.message).toMatch(/not on right now/)
    expect((await a.rpc('buy_item', { p_item: item })).error?.message).toMatch(/festival stall/)
    expect((await a.rpc('buy_festival_item', { p_item: 'leaf_crown' })).error?.message).toMatch(/No such festival item/)
  })

  it('only admins can preview', async () => {
    const { error } = await a.rpc('set_festival_preview', { p_id: 'cny_2027' })
    expect(error?.message).toMatch(/Admins only/)
  })
})

describe.skipIf(!url || !key || !adminEmail || !adminPassword)('festivals: admin preview', () => {
  let admin: SupabaseClient
  beforeAll(async () => {
    admin = newClient()
    const { error } = await admin.auth.signInWithPassword({ email: adminEmail!, password: adminPassword! })
    if (error) throw error
  })
  afterAll(async () => {
    await admin?.rpc('set_festival_preview', { p_id: null })
  })

  it('an admin preview shows that festival once, and reset sets 50 tokens', async () => {
    const { error } = await admin.rpc('set_festival_preview', { p_id: 'cny_2027', p_reset: true })
    expect(error).toBeNull()
    const { data } = await admin.rpc('my_festivals')
    const f = data as Festivals
    const cny = f.festivals.filter((x) => x.kind === 'cny')
    expect(cny).toEqual([expect.objectContaining({ id: 'cny_2027', preview: true })])
    expect(f.tokens).toBe(50)
  })

  it('an admin preview gives the five festival missions, harvesting fills them, and an ended festival cannot be claimed', async () => {
    await admin.rpc('set_festival_preview', { p_id: 'merdeka_2027', p_reset: true })
    const mine = async () => ((await admin.rpc('my_missions')).data as Mission[]).filter((x) => x.festival === 'merdeka')
    const m = await mine()
    expect(m).toHaveLength(5)
    expect(m.every((x) => x.progress === 0 && !x.claimed)).toBe(true)
    expect(m.find((x) => x.template_id === 'f_merdeka_daily')).toMatchObject({ period: 'daily', target: 5, tokens: 2, ends_on: null })
    expect(m.filter((x) => x.period === 'festival').every((x) => x.ends_on === '2027-09-16')).toBe(true)

    await harvestRight(admin, 5)
    const after = await mine()
    const daily = after.find((x) => x.template_id === 'f_merdeka_daily')!
    expect(daily.completed).toBe(true)
    expect(after.find((x) => x.template_id === 'f_merdeka_harvest')!.progress).toBe(5)

    // Merdeka off: its missions disappear and cannot be claimed.
    await admin.rpc('set_festival_preview', { p_id: 'cny_2027' })
    expect(await mine()).toEqual([])
    expect((await admin.rpc('claim_mission', { p_id: daily.id })).error?.message).toMatch(/ended/)

    await admin.rpc('set_festival_preview', { p_id: 'merdeka_2027' })
    const { data, error } = await admin.rpc('claim_mission', { p_id: daily.id })
    expect(error).toBeNull()
    expect(data).toMatchObject({ tokens: 2, totals: expect.objectContaining({ tokens: 52 }) })
    expect((await admin.rpc('claim_mission', { p_id: daily.id })).error?.message).toMatch(/already claimed/)
  }, 60000)

  it('an admin can buy a previewed festival item once with tokens, and a reset takes it back', async () => {
    await admin.rpc('set_festival_preview', { p_id: 'year_end_2026', p_reset: true })
    expect((await admin.rpc('buy_festival_item', { p_item: 'pet_shades' })).data).toEqual({ item_id: 'pet_shades', tokens: 30 })
    expect((await admin.rpc('buy_festival_item', { p_item: 'pet_shades' })).error?.message).toMatch(/already own/)
    expect((await admin.rpc('buy_festival_item', { p_item: 'holiday_sunhat' })).data).toEqual({ item_id: 'holiday_sunhat', tokens: 0 })
    await admin.rpc('set_festival_preview', { p_id: 'year_end_2026', p_reset: true })
    expect((await admin.rpc('buy_festival_item', { p_item: 'holiday_sunhat' })).error).toBeNull()
  })

  it('buying without enough tokens is refused', async () => {
    await admin.rpc('set_festival_preview', { p_id: 'cny_2027', p_reset: true })
    expect((await admin.rpc('buy_festival_item', { p_item: 'lion_dance_hat' })).data).toMatchObject({ tokens: 20 })
    expect((await admin.rpc('buy_festival_item', { p_item: 'pet_lantern' })).data).toMatchObject({ tokens: 0 })
    await admin.rpc('set_festival_preview', { p_id: 'raya_2027' })
    expect((await admin.rpc('buy_festival_item', { p_item: 'pet_ketupat' })).error?.message).toMatch(/Not enough festival tokens/)
  })
})
