import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { byId, rightAnswer as right } from './answers'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
// The owner's admin account (from .env.test.local, never committed) plays the teacher and the parent; links are removed at the end.
const adultEmail = process.env.TEST_ADMIN_EMAIL
const adultPassword = process.env.TEST_ADMIN_PASSWORD
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const newClient = () => createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })

async function guest(year: number) {
  const c = newClient()
  const { error } = await c.auth.signInAnonymously()
  if (error) throw error
  await c.rpc('set_birth_year', { p_year: year })
  await c.from('academic_profiles').insert({ level_id: 'primary', country_code: 'MY', curriculum_id: 'international', language: 'en', subject_ids: ['science'], goals: [], difficulty: 3 })
  return c
}

// Two guest sign-ins only: Supabase limits them per hour (decision #20).
describe.skipIf(!url || !key || !adultEmail)('teacher mode (live project)', () => {
  let adultGuest: SupabaseClient
  let child: SupabaseClient
  let teacher: SupabaseClient
  let childId = ''
  let classId = ''
  let code = ''
  beforeAll(async () => {
    adultGuest = await guest(2000)
    child = await guest(2014)
    childId = (await child.auth.getUser()).data.user!.id
    teacher = newClient()
    const { error } = await teacher.auth.signInWithPassword({ email: adultEmail!, password: adultPassword! })
    if (error) throw error
  })
  afterAll(async () => {
    if (classId) await teacher.rpc('archive_class', { p_class: classId })
    if (childId) await teacher.rpc('remove_child', { p_child: childId })
  })

  it('guests cannot run a class; a bad code joins nothing', async () => {
    expect((await adultGuest.rpc('create_class', { p_name: 'Kelas Ujian', p_school: null })).error?.message).toMatch(/teacher account/i)
    expect((await adultGuest.rpc('join_class', { p_code: 'ZZZZ-ZZZZ' })).error?.message).toMatch(/not valid/i)
  })

  it('a teacher creates a class; a child joins only after a parent approves', async () => {
    expect((await teacher.rpc('create_class', { p_name: 'x', p_school: null })).error).not.toBeNull()
    const made = await teacher.rpc('create_class', { p_name: '6 Bestari', p_school: 'SK Taman Ujian' })
    expect(made.error).toBeNull()
    classId = made.data.id
    code = made.data.code
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/)
    expect(((await teacher.rpc('my_classes')).data as { id: string }[]).map((c) => c.id)).toContain(classId)

    expect((await child.rpc('join_class', { p_code: code })).error?.message).toMatch(/parent must approve/i)
    const ask = (await child.rpc('request_guardian_code')).data
    expect((await teacher.rpc('approve_child', { p_code: ask.code, p_confirm: true })).error).toBeNull()
    const joined = await child.rpc('join_class', { p_code: code.toLowerCase().replace('-', '') })
    expect(joined.error).toBeNull()
    expect(joined.data).toMatchObject({ class_id: classId, name: '6 Bestari' })
    expect(((await child.rpc('my_student_classes')).data as { class_id: string }[]).map((c) => c.class_id)).toContain(classId)
  })

  it('quests count right answers on their topic and show in the class report', { timeout: 120_000 }, async () => {
    const { data: s } = await child.rpc('start_encounter', { p_monster: 'hornbill' })
    const q = byId.get(s.question.id)!
    expect((await teacher.rpc('create_quest', { p_class: classId, p_subject: q.subject, p_topic: q.topic, p_tp: null, p_target: 3, p_due: '2099-01-01' })).error).not.toBeNull()
    expect((await teacher.rpc('create_quest', { p_class: classId, p_subject: 'science', p_topic: 'No such topic', p_tp: null, p_target: 5, p_due: '2099-01-01' })).error?.message).toMatch(/no questions/i)
    const quest = await teacher.rpc('create_quest', { p_class: classId, p_subject: q.subject, p_topic: q.topic, p_tp: null, p_target: 5, p_due: '2099-01-01' })
    expect(quest.error).toBeNull()
    const catalog = (await teacher.rpc('quest_catalog')).data as { subject: string; topic: string; questions: number }[]
    expect(catalog.some((c) => c.subject === q.subject && c.topic === q.topic && c.questions > 0)).toBe(true)

    await wait(1600)
    expect((await child.rpc('answer_question', { p_encounter: s.encounter_id, p_answer: right(q.id) })).error).toBeNull()
    await child.rpc('flee_encounter', { p_encounter: s.encounter_id })
    const mine = ((await child.rpc('my_student_classes')).data as { class_id: string; quests: { id: string; progress: number; target: number }[] }[]).find((c) => c.class_id === classId)!
    expect(mine.quests.find((x) => x.id === quest.data.id)).toMatchObject({ progress: 1, target: 5 })

    const report = (await teacher.rpc('class_report', { p_class: classId })).data
    const row = report.students.find((x: { student_id: string }) => x.student_id === childId)
    expect(row.questions).toBeGreaterThanOrEqual(1)
    expect(row.quests.find((x: { quest_id: string }) => x.quest_id === quest.data.id).progress).toBe(1)
    expect((await child.rpc('class_report', { p_class: classId })).error?.message).toMatch(/not your class/i)
  })

  it('the parent sees the class and can take the child out of it', async () => {
    const classes = (await teacher.rpc('child_classes', { p_child: childId })).data as { class_id: string }[]
    expect(classes.map((c) => c.class_id)).toContain(classId)
    expect((await adultGuest.rpc('child_classes', { p_child: childId })).error?.message).toMatch(/not your child/i)
    expect((await teacher.rpc('guardian_remove_class', { p_child: childId, p_class: classId })).error).toBeNull()
    expect(((await child.rpc('my_student_classes')).data as { class_id: string }[]).map((c) => c.class_id)).not.toContain(classId)
  })
})
