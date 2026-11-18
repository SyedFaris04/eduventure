import { beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

// One guest sign-in: Supabase limits them per hour (decision #20).
describe.skipIf(!url || !key)('curriculum tags and TP (live project)', () => {
  let a: SupabaseClient
  beforeAll(async () => {
    a = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error } = await a.auth.signInAnonymously()
    if (error) throw error
  })

  it('estimates the TP level from right answers at each level', async () => {
    const tp = async (tps: number[], correct: boolean[]) => (await a.rpc('estimate_tp', { p_tps: tps, p_correct: correct })).data
    expect(await tp([], [])).toBeNull()
    expect(await tp([1, 1, 2], [true, true, false])).toBe(1)
    expect(await tp([1, 2, 3, 3], [true, true, true, true])).toBe(3)
    expect(await tp([3, 3, 3, 3, 3], [true, true, false, false, false])).toBeNull() // only 40% right
    expect(await tp([2, 2, 4, 4, 4], [true, true, true, true, false])).toBe(4)
  })

  it('questions carry their tag and a TP level from Bloom', async () => {
    const { data, error } = await a.rpc('question_curriculum', { p_id: 'pri-math-016' })
    expect(error).toBeNull()
    expect(data).toMatchObject({ curriculum: { system: 'KSSR', subject: 'Matematik' }, tp: 3 }) // bloom "apply"
  })
})
