import { beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

describe.skipIf(!url || !key)('server-side marking of every question type', () => {
  let c: SupabaseClient
  const mark = async (type: string, answerKey: unknown, answer: unknown) => (await c.rpc('is_correct', { p_type: type, p_key: answerKey, p_answer: answer })).data as boolean

  beforeAll(async () => {
    c = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error } = await c.auth.signInAnonymously()
    if (error) throw error
  })

  it('multiple-select needs exactly the right set, in any order', async () => {
    expect(await mark('multi_select', ['a', 'c'], { choices: ['c', 'a'] })).toBe(true)
    expect(await mark('multi_select', ['a', 'c'], { choices: ['a'] })).toBe(false)
    expect(await mark('multi_select', ['a', 'c'], { choices: ['a', 'b', 'c'] })).toBe(false)
    expect(await mark('multi_select', ['a', 'c'], { choices: ['a', 'a', 'c'] })).toBe(false)
  })

  it('ordering needs the exact sequence', async () => {
    expect(await mark('ordering', ['b', 'a', 'c'], { order: ['b', 'a', 'c'] })).toBe(true)
    expect(await mark('ordering', ['b', 'a', 'c'], { order: ['a', 'b', 'c'] })).toBe(false)
  })

  it('matching needs every pair right', async () => {
    expect(await mark('matching', { a: 'x', b: 'y' }, { pairs: { b: 'y', a: 'x' } })).toBe(true)
    expect(await mark('matching', { a: 'x', b: 'y' }, { pairs: { a: 'y', b: 'x' } })).toBe(false)
    expect(await mark('matching', { a: 'x', b: 'y' }, { pairs: { a: 'x' } })).toBe(false)
  })

  it('short answer ignores case, spacing and punctuation', async () => {
    expect(await mark('short_answer', { accept: ['photosynthesis'] }, { text: '  Photosynthesis! ' })).toBe(true)
    expect(await mark('short_answer', { accept: ['carbon dioxide', 'CO2'] }, { text: 'Carbon  dioxide' })).toBe(true)
    expect(await mark('short_answer', { accept: ['photosynthesis'] }, { text: 'respiration' })).toBe(false)
  })

  it('malformed answers are simply wrong, never errors', async () => {
    expect(await mark('multi_select', ['a'], { choices: 'a' })).toBe(false)
    expect(await mark('ordering', ['a', 'b'], { order: null })).toBe(false)
    expect(await mark('matching', { a: 'x' }, { pairs: 'x' })).toBe(false)
  })
})
