import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
// The parent and moderator is the owner's admin account from .env.test.local (never committed); its links are removed at the end.
const adminEmail = process.env.TEST_ADMIN_EMAIL
const adminPassword = process.env.TEST_ADMIN_PASSWORD
const QA = 'qa_camp' // a hidden board that is always built (no map reaches it)
const year = new Date().getFullYear()

const newClient = () => createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })
async function guest(birthYear?: number) {
  const c = newClient()
  const { error } = await c.auth.signInAnonymously()
  if (error) throw error
  if (birthYear) await c.rpc('set_birth_year', { p_year: birthYear })
  return c
}

type Rights = { can_write: boolean; can_type: boolean; reason: string | null }
type Note = { id: number; public_id: string; name: string | null; sticker: string | null; phrase: string | null; body: string | null; created_at: string; mine: boolean }
const rights = async (c: SupabaseClient) => (await c.rpc('board_rights')).data as Rights
const board = async (c: SupabaseClient, place = QA) => (await c.rpc('island_board', { p_place: place })).data as { open: boolean; notes: Note[] }
const post = (c: SupabaseClient, note: { sticker?: string; phrase?: string; body?: string }, place = QA) =>
  c.rpc('post_note', { p_place: place, p_sticker: note.sticker ?? null, p_phrase: note.phrase ?? null, p_body: note.body ?? null })
const uidOf = async (c: SupabaseClient) => (await c.auth.getUser()).data.user!.id

// Four guest sign-ins only: Supabase limits them per hour (decision #20).
describe.skipIf(!url || !key || !adminEmail || !adminPassword)('whiteboard camps (live project)', () => {
  let adultGuest: SupabaseClient
  let noAge: SupabaseClient
  let child: SupabaseClient
  let teen: SupabaseClient
  let admin: SupabaseClient
  let childId = ''
  let teenId = ''
  const stamp = Date.now().toString(36)
  let teenNote = 0
  let childNote = 0

  beforeAll(async () => {
    adultGuest = await guest(2000)
    noAge = await guest()
    child = await guest(year - 9)
    teen = await guest(year - 15)
    childId = await uidOf(child)
    teenId = await uidOf(teen)
    admin = newClient()
    const { error } = await admin.auth.signInWithPassword({ email: adminEmail!, password: adminPassword! })
    if (error) throw error
  })
  afterAll(async () => {
    for (const id of [childId, teenId]) if (id) await admin.rpc('remove_child', { p_child: id })
  })

  it('without a parent, minors and unknown ages cannot write; adult guests can only read', async () => {
    expect(await rights(adultGuest)).toEqual({ can_write: false, can_type: false, reason: 'guest' })
    expect((await rights(noAge)).reason).toBe('no_age')
    expect((await rights(child)).reason).toBe('awaiting_parent')
    expect((await rights(teen)).reason).toBe('needs_parent')
    expect((await post(adultGuest, { sticker: 'star' })).error?.message).toMatch(/cannot write here: guest/)
  })

  it('with an approving parent, a child writes stickers and phrases and a teen may type', async () => {
    for (const kid of [child, teen]) {
      const { data } = await kid.rpc('request_guardian_code')
      const { error } = await admin.rpc('approve_child', { p_code: data.code, p_confirm: true })
      expect(error).toBeNull()
    }
    expect(await rights(child)).toEqual({ can_write: true, can_type: false, reason: null })
    expect(await rights(teen)).toEqual({ can_write: true, can_type: true, reason: null })
  })

  it('notes are pinned and checked on the server', async () => {
    const typed = await post(teen, { sticker: 'idea', body: `Plants make oxygen ${stamp}` })
    expect(typed.error).toBeNull()
    teenNote = typed.data.id
    const mine = (await board(teen)).notes.find((n) => n.id === teenNote)!
    expect(mine).toMatchObject({ mine: true, sticker: 'idea', body: `Plants make oxygen ${stamp}` })
    expect((await post(teen, { body: 'call me 0123456789' })).error?.message).toMatch(/Not allowed: phone/)
    expect((await post(teen, { body: 'x'.repeat(121) })).error?.message).toMatch(/Too long/)
    expect((await post(teen, { sticker: 'nope' })).error?.message).toMatch(/Unknown sticker/)
    expect((await post(teen, {})).error?.message).toMatch(/Empty note/)
    expect((await post(child, { body: 'hello' })).error?.message).toMatch(/Stickers and phrases only/)
    const sticker = await post(child, { sticker: 'star', phrase: 'p01' })
    expect(sticker.error).toBeNull()
    childNote = sticker.data.id
  })

  it('a board whose stand is not built is closed', async () => {
    const camp = (await adultGuest.rpc('camp_state', { p_place: 'greenhaven' })).data as { project: string; built: boolean }[]
    if (camp.find((p) => p.project === 'whiteboard')?.built) return // built in production by real players
    expect(await board(adultGuest, 'greenhaven')).toEqual({ open: false, notes: [] })
    expect((await post(teen, { sticker: 'star' }, 'greenhaven')).error?.message).toMatch(/not built/)
  })

  it('under-13 readers never receive typed notes; others do', async () => {
    const forChild = (await board(child)).notes
    expect(forChild.some((n) => n.id === childNote)).toBe(true)
    expect(forChild.some((n) => n.body !== null)).toBe(false)
    const forAdult = (await board(adultGuest)).notes
    expect(forAdult.map((n) => n.id)).toEqual(expect.arrayContaining([teenNote, childNote]))
    expect(forAdult.find((n) => n.id === teenNote)!.mine).toBe(false)
  })

  it('hiding a player hides their notes for me', async () => {
    const teenPublic = (await board(adultGuest)).notes.find((n) => n.id === teenNote)!.public_id
    await adultGuest.rpc('block_player', { p_public_id: teenPublic })
    expect((await board(adultGuest)).notes.some((n) => n.id === teenNote)).toBe(false)
    await adultGuest.rpc('unblock_player', { p_public_id: teenPublic })
    expect((await board(adultGuest)).notes.some((n) => n.id === teenNote)).toBe(true)
  })

  it('a writer who is not visible to others leaves the board and cannot write', async () => {
    await teen.from('user_privacy_settings').update({ visible_to_others: false }).eq('user_id', teenId)
    expect((await board(adultGuest)).notes.some((n) => n.id === teenNote)).toBe(false)
    expect((await rights(teen)).reason).toBe('hidden_self')
    await teen.from('user_privacy_settings').update({ visible_to_others: true }).eq('user_id', teenId)
    expect((await board(adultGuest)).notes.some((n) => n.id === teenNote)).toBe(true)
  })

  it("a parent can switch off a child's writing", async () => {
    await admin.rpc('set_child_board_writing', { p_child: teenId, p_on: false })
    expect((await rights(teen)).reason).toBe('parent_off')
    const kids = (await admin.rpc('my_children')).data as { child_id: string; board_writing: boolean }[]
    expect(kids.find((k) => k.child_id === teenId)!.board_writing).toBe(false)
    expect((await teen.rpc('set_child_board_writing', { p_child: teenId, p_on: true })).error?.message).toMatch(/Not your child/)
    await admin.rpc('set_child_board_writing', { p_child: teenId, p_on: true })
    expect((await rights(teen)).reason).toBeNull()
  })

  it('five notes an hour', async () => {
    for (let i = 0; i < 4; i++) expect((await post(teen, { phrase: 'p02' })).error).toBeNull()
    expect((await post(teen, { phrase: 'p02' })).error?.message).toMatch(/Too many notes/)
    const own = (await board(teen)).notes.filter((n) => n.mine && n.phrase === 'p02')
    expect((await teen.rpc('delete_my_note', { p_id: own[0].id })).error).toBeNull()
    expect((await board(teen)).notes.some((n) => n.id === own[0].id)).toBe(false)
  })

  it('three reports hide a note until a moderator decides', async () => {
    expect((await child.rpc('report_note', { p_id: childNote, p_reason: 'rude' })).error?.message).toMatch(/your own note/)
    for (const r of [adultGuest, noAge]) expect((await r.rpc('report_note', { p_id: childNote, p_reason: 'unkind' })).error).toBeNull()
    expect((await board(teen)).notes.some((n) => n.id === childNote)).toBe(true)
    expect((await teen.rpc('report_note', { p_id: childNote, p_reason: 'other' })).error).toBeNull()
    expect((await board(teen)).notes.some((n) => n.id === childNote)).toBe(false)

    expect((await adultGuest.rpc('reported_notes')).error?.message).toMatch(/Not allowed/)
    expect((await adultGuest.rpc('resolve_note', { p_id: childNote, p_remove: true })).error?.message).toMatch(/Not allowed/)
    const reported = (await admin.rpc('reported_notes')).data as { id: number; reports: number; hidden: boolean }[]
    expect(reported.find((n) => n.id === childNote)).toMatchObject({ reports: 3, hidden: true })
    expect((await admin.rpc('resolve_note', { p_id: childNote, p_remove: false })).error).toBeNull()
    expect((await board(teen)).notes.some((n) => n.id === childNote)).toBe(true)
    expect((await admin.rpc('resolve_note', { p_id: childNote, p_remove: true })).error).toBeNull()
    expect((await board(teen)).notes.some((n) => n.id === childNote)).toBe(false)
  })
})
