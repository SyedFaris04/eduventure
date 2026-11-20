import { describe, expect, it } from 'vitest'
import { MAX_VISIBLE, Room, recipients, type Card, type Out } from './room'

let clock = 0
const room = () => new Room(() => clock)
const card = (id: string, o: Partial<Card> = {}): Card => ({ public_id: id, visible: true, can_emote: true, banned: false, name: `P ${id}`, appearance: { top: 'x' }, pet: null, ...o })
const msgs = (out: Out[] | 'full', t: string) => (out === 'full' ? [] : out.filter((o) => (o.msg as { t: string }).t === t))

describe('Room', () => {
  it('a joiner gets welcome with the others; the others get join', () => {
    const r = room()
    r.join('a', card('A'))
    const out = r.join('b', card('B'))
    const [welcome] = msgs(out, 'welcome')
    expect(welcome).toMatchObject({ to: 'one', conn: 'b', msg: { t: 'welcome', you: 'B', can_emote: true } })
    expect((welcome.msg as { players: { id: string }[] }).players.map((p) => p.id)).toEqual(['A'])
    const [join] = msgs(out, 'join')
    expect(join).toMatchObject({ to: 'all-but', conn: 'b', msg: { t: 'join', p: { id: 'B', name: 'P B', x: 0, y: 0, battle: false } } })
    expect(Object.keys((join.msg as { p: object }).p).sort()).toEqual(['appearance', 'battle', 'id', 'name', 'pet', 'x', 'y'])
  })

  it('the 13th visible player is told the room is full; hidden players never count or show', () => {
    const r = room()
    for (let i = 0; i < MAX_VISIBLE; i++) r.join(`c${i}`, card(`P${i}`))
    expect(r.join('x', card('X'))).toBe('full')
    const hidden = r.join('h', card('H', { visible: false }))
    expect(hidden).not.toBe('full')
    expect(msgs(hidden, 'join')).toEqual([])
    expect((msgs(hidden, 'welcome')[0].msg as { players: unknown[] }).players).toHaveLength(MAX_VISIBLE)
    expect(msgs(r.leave('h'), 'leave')).toEqual([])
  })

  it('a second connection with the same player replaces the first', () => {
    const r = room()
    r.join('a', card('A'))
    r.join('b1', card('B'))
    const out = r.join('b2', card('B'))
    expect(out).not.toBe('full')
    expect(msgs(out, 'replaced')).toEqual([{ to: 'one', conn: 'b1', msg: { t: 'replaced' } }])
    expect(msgs(out, 'join')).toEqual([])
    expect(r.player('b1')).toBeUndefined()
    expect(r.player('b2')?.card.public_id).toBe('B')
  })

  it('moves are clamped, rounded and limited to 4 a second', () => {
    const r = room()
    r.join('a', card('A'))
    r.join('b', card('B'))
    clock = 10_000
    expect(msgs(r.move('a', { x: 3.14159, y: 999, battle: 1 }), 'move')[0]).toEqual({ to: 'all-but', conn: 'a', msg: { t: 'move', id: 'A', x: 3.14, y: 200, battle: true } })
    expect(msgs(r.move('a', { x: -5, y: 'z', battle: 0 }), 'move')[0].msg).toMatchObject({ x: 0, y: 0, battle: false })
    r.move('a', { x: 1, y: 1, battle: false })
    r.move('a', { x: 1, y: 1, battle: false })
    expect(r.move('a', { x: 2, y: 2, battle: false })).toEqual([])
    clock = 11_001
    expect(r.move('a', { x: 2, y: 2, battle: false })).toHaveLength(1)
  })

  it('only allowed emotes, once every 2 seconds, from players who may emote and are visible', () => {
    const r = room()
    clock = 50_000
    r.join('a', card('A'))
    r.join('quiet', card('Q', { can_emote: false }))
    r.join('h', card('H', { visible: false }))
    expect(r.emote('a', 'rude')).toEqual([])
    expect(r.emote('a', 'wave')).toEqual([{ to: 'all', conn: 'a', msg: { t: 'emote', id: 'A', e: 'wave' } }])
    expect(r.emote('a', 'cheer')).toEqual([])
    clock = 52_001
    expect(r.emote('a', 'cheer')).toHaveLength(1)
    expect(r.emote('quiet', 'wave')).toEqual([])
    expect(r.emote('h', 'wave')).toEqual([])
  })

  it('leaving tells the others', () => {
    const r = room()
    r.join('a', card('A'))
    r.join('b', card('B'))
    expect(r.leave('a')).toEqual([{ to: 'all-but', conn: 'a', msg: { t: 'leave', id: 'A' } }])
    expect(r.leave('a')).toEqual([])
  })

  it('players restored after hibernation keep their place', () => {
    const r = room()
    r.restore('a', { card: card('A'), x: 4, y: 5, battle: true })
    const out = r.join('b', card('B'))
    expect((msgs(out, 'welcome')[0].msg as { players: object[] }).players[0]).toMatchObject({ id: 'A', x: 4, y: 5, battle: true })
  })

  it('welcome tells a player whether others can see them', () => {
    const r = room()
    expect((msgs(r.join('h', card('H', { visible: false })), 'welcome')[0].msg as { visible: boolean }).visible).toBe(false)
    expect((msgs(r.join('a', card('A')), 'welcome')[0].msg as { visible: boolean }).visible).toBe(true)
  })

  it('a visible player who comes back hidden (a second tab after a parent switched them off) disappears for the others', () => {
    const r = room()
    r.join('a', card('A'))
    r.join('k1', card('K'))
    const out = r.join('k2', card('K', { visible: false }))
    expect(msgs(out, 'leave')).toEqual([{ to: 'all-but', conn: 'k2', msg: { t: 'leave', id: 'K' } }])
  })

  it('a connection sending more than 20 messages a second is flagged', () => {
    const r = room()
    clock = 90_000
    r.join('a', card('A'))
    for (let i = 0; i < 20; i++) expect(r.note('a')).toBe(true)
    expect(r.note('a')).toBe(false)
    clock = 91_001
    expect(r.note('a')).toBe(true)
  })

  it('room traffic only reaches players who have joined; a direct message reaches its socket', () => {
    const joined = (c: string) => c === 'a' || c === 'b'
    const conns = ['a', 'b', 'lurker']
    expect(recipients({ to: 'all', conn: 'a', msg: {} }, conns, joined)).toEqual(['a', 'b'])
    expect(recipients({ to: 'all-but', conn: 'a', msg: {} }, conns, joined)).toEqual(['b'])
    expect(recipients({ to: 'one', conn: 'gone', msg: {} }, [...conns, 'gone'], joined)).toEqual(['gone'])
  })
})
