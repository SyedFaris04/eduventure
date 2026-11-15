import { beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import nameParts from '../../src/features/character/nameParts.json'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const configured = Boolean(url && key)
if (!configured) console.warn('RLS tests skipped: VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY missing in .env.local')

const year = new Date().getFullYear()
const newClient = () => createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })

const validProfile = {
  level_id: 'upper_secondary',
  country_code: 'MY',
  curriculum_id: 'my_kssm',
  grade_id: 'my_kssm_upper_secondary_1',
  language: 'en',
  subject_ids: ['mathematics'],
  goals: ['exam_prep'],
  difficulty: 3,
}

const appearance = { body: 'a', skin: 'skin_3', hairStyle: 'hair_spiky', hairColour: '#3b2a1e' }

describe.skipIf(!configured)('row level security (live project)', () => {
  let a: SupabaseClient
  let b: SupabaseClient
  let aId: string
  let bId: string

  beforeAll(async () => {
    a = newClient()
    b = newClient()
    const ra = await a.auth.signInAnonymously()
    const rb = await b.auth.signInAnonymously()
    if (ra.error || rb.error) throw ra.error ?? rb.error
    aId = ra.data.user!.id
    bId = rb.data.user!.id
    const { error } = await b.from('academic_profiles').insert(validProfile)
    if (error) throw error
  })

  it('creates the per-player rows on sign-up', async () => {
    const { data: wallet } = await a.from('player_wallets').select('gold').single()
    const { data: xp } = await a.from('player_xp').select('xp, level').single()
    const { data: profile } = await a.from('profiles').select('is_guest, birth_year').single()
    expect(wallet).toEqual({ gold: 0 })
    expect(xp).toEqual({ xp: 0, level: 1 })
    expect(profile).toEqual({ is_guest: true, birth_year: null })
  })

  it("does not let A read B's academic profile", async () => {
    const { data, error } = await a.from('academic_profiles').select('*').eq('user_id', bId)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('does not let A change their own gold or XP', async () => {
    const wallet = await a.from('player_wallets').update({ gold: 999 }).eq('user_id', aId).select()
    const xp = await a.from('player_xp').update({ xp: 999 }).eq('user_id', aId).select()
    expect(wallet.error ?? (wallet.data?.length === 0 ? 'no rows' : null)).not.toBeNull()
    expect(xp.error ?? (xp.data?.length === 0 ? 'no rows' : null)).not.toBeNull()
    const { data } = await a.from('player_wallets').select('gold').single()
    expect(data).toEqual({ gold: 0 })
  })

  it('does not let A write their own birth year directly', async () => {
    await a.from('profiles').update({ birth_year: 1990 }).eq('id', aId)
    const { data } = await a.from('profiles').select('birth_year').single()
    expect(data).toEqual({ birth_year: null })
  })

  it('does not let A write a row owned by B', async () => {
    const { error } = await a.from('characters').insert({ user_id: bId, name: 'Brave Otter', appearance })
    expect(error).not.toBeNull()
  })

  it('hides system tables completely', async () => {
    const audit = await a.from('audit_logs').select('*')
    const roles = await a.from('admin_roles').select('*')
    expect(audit.error).not.toBeNull()
    expect(roles.error).not.toBeNull()
  })

  it('computes age bands with the youngest-possible-age rule', async () => {
    const band = async (y: number) => (await a.rpc('age_band_for', { p_birth_year: y })).data
    expect(await band(year - 13)).toBe('under13')
    expect(await band(year - 14)).toBe('teen')
    expect(await band(year - 18)).toBe('teen')
    expect(await band(year - 19)).toBe('adult')
  })

  it('lets a guest set their birth year exactly once', async () => {
    const first = await a.rpc('set_birth_year', { p_year: year - 10 })
    expect(first.error).toBeNull()
    expect(first.data).toBe('under13')
    const second = await a.rpc('set_birth_year', { p_year: 1990 })
    expect(second.error?.message).toMatch(/already set/)
  })

  it('rejects free-text names for under-13 players and accepts generated ones', async () => {
    const free = await a.from('characters').insert({ name: 'Bob123', appearance })
    expect(free.error?.message).toMatch(/name generator/)
    const generated = `${nameParts.adjectives[0]} ${nameParts.nouns[0]}`
    const ok = await a.from('characters').insert({ name: generated, appearance }).select('name').single()
    expect(ok.error).toBeNull()
    expect(ok.data).toEqual({ name: generated })
    const { data: profile } = await a.from('profiles').select('display_name').single()
    expect(profile).toEqual({ display_name: generated })
  })

  it('rejects appearance values that are not short option ids', async () => {
    const { error } = await b.from('characters').insert({ name: 'Brave Otter', appearance: { hair: '<script>' } })
    expect(error).not.toBeNull()
  })

  it('rejects an academic profile whose curriculum does not match the country', async () => {
    const { error } = await a.from('academic_profiles').insert({ ...validProfile, country_code: 'FR' })
    expect(error?.message).toMatch(/not offered/)
  })
})
