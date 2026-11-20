import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startRoom } from './roomClient'
import { useRoom } from './useRoom'

class FakeSocket {
  static all: FakeSocket[] = []
  sent: Record<string, unknown>[] = []
  readyState = 0
  onopen: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  onclose: ((e: { code: number }) => void) | null = null
  onerror: (() => void) | null = null
  constructor(public url: string) {
    FakeSocket.all.push(this)
  }
  send(text: string) {
    this.sent.push(JSON.parse(text))
  }
  close() {
    this.readyState = 3
  }
  open() {
    this.readyState = 1
    this.onopen?.()
  }
  receive(msg: object) {
    this.onmessage?.({ data: JSON.stringify(msg) })
  }
  drop(code = 1006) {
    this.readyState = 3
    this.onclose?.({ code })
  }
}
const last = () => FakeSocket.all.at(-1)!
const flush = () => vi.advanceTimersByTimeAsync(0)
const p = (id: string, o = {}) => ({ id, name: `P ${id}`, appearance: {}, pet: null, x: 1, y: 2, battle: false, ...o })

function start(blocked = new Set<string>(), token = vi.fn(async () => 'tok-1')) {
  const client = startRoom({ url: 'ws://rooms', place: 'greenhaven', token, WebSocketImpl: FakeSocket as unknown as typeof WebSocket, blocked: () => blocked })
  return { client, token }
}

describe('room client', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    FakeSocket.all = []
  })
  afterEach(() => vi.useRealTimers())

  it('says hello with a fresh token and tries the next slot when a room is full', async () => {
    const { token } = start()
    expect(last().url).toBe('ws://rooms/room/greenhaven/0')
    last().open()
    await flush()
    expect(last().sent[0]).toEqual({ t: 'hello', token: 'tok-1' })
    last().receive({ t: 'full' })
    last().drop(1000)
    await flush()
    expect(last().url).toBe('ws://rooms/room/greenhaven/1')
    last().open()
    await flush()
    expect(token).toHaveBeenCalledTimes(2)
  })

  it('fills and empties the player list, and remembers whether it may emote', async () => {
    start()
    last().open()
    await flush()
    last().receive({ t: 'welcome', you: 'ME', can_emote: false, players: [p('A')] })
    expect(useRoom.getState()).toMatchObject({ status: 'online', you: 'ME', canEmote: false })
    last().receive({ t: 'join', p: p('B') })
    last().receive({ t: 'move', id: 'B', x: 5, y: 6, battle: true })
    expect(useRoom.getState().players.B).toMatchObject({ x: 5, y: 6, battle: true })
    last().receive({ t: 'leave', id: 'A' })
    expect(Object.keys(useRoom.getState().players)).toEqual(['B'])
    last().receive({ t: 'emote', id: 'B', e: 'wave' })
    expect(useRoom.getState().emotes.B.e).toBe('wave')
  })

  it('never shows a blocked player, their moves or their emotes', async () => {
    start(new Set(['X']))
    last().open()
    await flush()
    last().receive({ t: 'welcome', you: 'ME', can_emote: true, players: [p('X')] })
    last().receive({ t: 'join', p: p('X') })
    last().receive({ t: 'move', id: 'X', x: 5, y: 6, battle: false })
    last().receive({ t: 'emote', id: 'X', e: 'wave' })
    expect(useRoom.getState().players).toEqual({})
    expect(useRoom.getState().emotes).toEqual({})
  })

  it('goes solo and reconnects after 1 s, then 2 s, asking for the token again each time', async () => {
    const { token } = start()
    last().open()
    await flush()
    last().drop()
    expect(useRoom.getState().status).toBe('solo')
    const before = FakeSocket.all.length
    await vi.advanceTimersByTimeAsync(999)
    expect(FakeSocket.all.length).toBe(before)
    await vi.advanceTimersByTimeAsync(1)
    expect(FakeSocket.all.length).toBe(before + 1)
    last().drop()
    await vi.advanceTimersByTimeAsync(1999)
    expect(FakeSocket.all.length).toBe(before + 1)
    await vi.advanceTimersByTimeAsync(1)
    expect(FakeSocket.all.length).toBe(before + 2)
    last().open()
    await flush()
    expect(token).toHaveBeenCalledTimes(2)
  })

  it('stop clears everyone and closes the socket', async () => {
    const { client } = start()
    last().open()
    await flush()
    last().receive({ t: 'welcome', you: 'ME', can_emote: true, players: [p('A')] })
    const ws = last()
    client.stop()
    expect(ws.readyState).toBe(3)
    expect(useRoom.getState()).toMatchObject({ status: 'off', players: {}, emotes: {} })
    await vi.advanceTimersByTimeAsync(60_000)
    expect(FakeSocket.all.at(-1)).toBe(ws)
  })

  it('sends at most 2 moves a second, always ending with the latest position', async () => {
    const { client } = start()
    last().open()
    await flush()
    last().receive({ t: 'welcome', you: 'ME', can_emote: true, players: [] })
    for (let i = 0; i < 5; i++) client.sendMove(i, i, false)
    const moves = () => last().sent.filter((m) => m.t === 'move')
    expect(moves()).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(500)
    expect(moves()).toHaveLength(2)
    expect(moves()[1]).toEqual({ t: 'move', x: 4, y: 4, battle: false })
    await vi.advanceTimersByTimeAsync(2000)
    expect(moves()).toHaveLength(2)
  })
})
