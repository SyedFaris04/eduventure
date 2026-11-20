import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

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
})
