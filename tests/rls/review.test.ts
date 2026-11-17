import { beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
// Optional: an admin account for the reviewer-side tests (put these in .env.test.local, never commit).
const adminEmail = process.env.TEST_ADMIN_EMAIL
const adminPassword = process.env.TEST_ADMIN_PASSWORD
const newClient = () => createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })

describe.skipIf(!url || !key)('question review: players', () => {
  let player: SupabaseClient
  beforeAll(async () => {
    player = newClient()
    const { error } = await player.auth.signInAnonymously()
    if (error) throw error
  })

  it('cannot read the question bank, answer keys or review history', async () => {
    for (const table of ['questions', 'question_keys', 'question_reviews']) {
      const { data } = await player.from(table).select('*').limit(1)
      expect(data ?? [], table).toEqual([])
    }
  })

  it('cannot approve, publish or bulk-review questions', async () => {
    const one = await player.rpc('review_question', { p_id: 'pri-math-001', p_action: 'approve', p_note: null })
    const many = await player.rpc('bulk_review', { p_ids: ['pri-math-001'], p_action: 'publish', p_note: null })
    expect(one.error?.message).toMatch(/not allowed/i)
    expect(many.error?.message).toMatch(/not allowed/i)
  })

  it('cannot review lessons', async () => {
    const { error } = await player.rpc('review_lesson', { p_id: 'py-u1-l1', p_action: 'approve', p_note: '' })
    expect(error?.message).toMatch(/not allowed/i)
  })

  it('cannot read question statistics', async () => {
    const { error } = await player.rpc('question_stats')
    expect(error?.message).toMatch(/not allowed/i)
  })

  it('reports no roles for an ordinary player', async () => {
    const { data } = await player.rpc('my_roles')
    expect(data).toEqual([])
  })
})

describe.skipIf(!url || !key || !adminEmail || !adminPassword)('question review: admin', () => {
  let admin: SupabaseClient
  beforeAll(async () => {
    admin = newClient()
    const { error } = await admin.auth.signInWithPassword({ email: adminEmail!, password: adminPassword! })
    if (error) throw error
  })

  it('can read lessons with their answer keys', async () => {
    const steps = await admin.from('lesson_steps').select('id').eq('lesson_id', 'py-u1-l1')
    const keys = await admin.from('lesson_step_keys').select('step_id, answer').in('step_id', (steps.data ?? []).map((s) => s.id))
    expect(steps.data?.length).toBeGreaterThan(0)
    expect(keys.data?.length).toBeGreaterThan(0)
  })

  it('can read questions with their keys and history', async () => {
    const q = await admin.from('questions').select('id, status').eq('id', 'gen-001').single()
    const k = await admin.from('question_keys').select('answer').eq('question_id', 'gen-001').single()
    expect(q.data?.id).toBe('gen-001')
    expect(k.data?.answer).toBeTruthy()
  })

  it('walks a question through the workflow and records every step', async () => {
    const id = 'gen-010'
    const start = (await admin.from('questions').select('status').eq('id', id).single()).data!.status
    // Reset to in_review if a previous run left it elsewhere.
    if (start === 'published') await admin.rpc('review_question', { p_id: id, p_action: 'unpublish', p_note: 'test reset' })
    if (start !== 'in_review') await admin.rpc('review_question', { p_id: id, p_action: 'request_changes', p_note: 'test reset' })
    if (start !== 'in_review') await admin.rpc('review_question', { p_id: id, p_action: 'submit', p_note: 'test reset' })

    const approved = await admin.rpc('review_question', { p_id: id, p_action: 'approve', p_note: 'Looks right' })
    expect(approved.data).toMatchObject({ id, status: 'approved' })
    const published = await admin.rpc('review_question', { p_id: id, p_action: 'publish', p_note: null })
    expect(published.data).toMatchObject({ status: 'published' })
    const illegal = await admin.rpc('review_question', { p_id: id, p_action: 'approve', p_note: null })
    expect(illegal.error?.message).toMatch(/cannot approve/i)

    const history = await admin.from('question_reviews').select('action, to_status, note').eq('question_id', id).order('id', { ascending: false }).limit(2)
    expect(history.data?.map((h) => h.action)).toEqual(['publish', 'approve'])
  })

  it('bulk review reports what it skipped', async () => {
    const { data } = await admin.rpc('bulk_review', { p_ids: ['gen-010', 'does-not-exist'], p_action: 'publish', p_note: null })
    expect(data.done).toBe(0)
    expect(data.skipped.map((s: { id: string }) => s.id).sort()).toEqual(['does-not-exist', 'gen-010'])
  })
})
