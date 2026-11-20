import { EMPTY_ROOM, useRoom, type Emote, type OtherPlayer } from './useRoom'

export type RoomClient = { sendMove(x: number, y: number, battle: boolean): void; sendEmote(e: Emote): void; stop(): void }
type Options = { url: string; place: string; token: () => Promise<string | null>; WebSocketImpl?: typeof WebSocket; blocked: () => Set<string> }

const BACKOFF_S = [1, 2, 4, 8, 16, 30]
const MOVE_GAP_MS = 500
const LAST_SLOT = 49
/** Closed by the server for good reasons: don't keep knocking. */
const FINAL = new Set([4002, 4003])

/** One connection to the room server for a place: joins a room with space, reconnects with backoff, and keeps useRoom current. */
export function startRoom({ url, place, token, WebSocketImpl = WebSocket, blocked }: Options): RoomClient {
  let ws: WebSocket | null = null
  let slot = 0
  let attempt = 0
  let stopped = false
  let full = false
  let retry: ReturnType<typeof setTimeout> | undefined
  let moveTimer: ReturnType<typeof setTimeout> | undefined
  let pending: { x: number; y: number; battle: boolean } | null = null
  let lastMove = 0

  useRoom.setState({ ...EMPTY_ROOM, status: 'connecting' })
  const send = (msg: object) => ws?.readyState === 1 && ws.send(JSON.stringify(msg))
  const set = (f: (s: ReturnType<typeof useRoom.getState>) => Partial<ReturnType<typeof useRoom.getState>>) => useRoom.setState(f)

  function receive(raw: string) {
    let m: { t?: string; [k: string]: unknown }
    try {
      m = JSON.parse(raw)
    } catch {
      return
    }
    const hidden = (id: unknown) => typeof id === 'string' && blocked().has(id)
    switch (m.t) {
      case 'welcome': {
        attempt = 0
        const players = (m.players as OtherPlayer[]).filter((p) => !hidden(p.id))
        useRoom.setState({ status: 'online', you: m.you as string, visible: m.visible !== false, canEmote: m.can_emote !== false, players: Object.fromEntries(players.map((p) => [p.id, p])), emotes: {} })
        break
      }
      case 'join': {
        const p = m.p as OtherPlayer
        if (!hidden(p.id)) set((s) => ({ players: { ...s.players, [p.id]: p } }))
        break
      }
      case 'move':
        if (hidden(m.id)) break
        set((s) => {
          const p = s.players[m.id as string]
          return p ? { players: { ...s.players, [p.id]: { ...p, x: m.x as number, y: m.y as number, battle: Boolean(m.battle) } } } : {}
        })
        break
      case 'emote':
        if (!hidden(m.id)) set((s) => ({ emotes: { ...s.emotes, [m.id as string]: { e: m.e as Emote, at: Date.now() } } }))
        break
      case 'leave':
        set((s) => {
          const players = { ...s.players }
          delete players[m.id as string]
          return { players }
        })
        break
      case 'full':
        full = true
        break
    }
  }

  function connect() {
    full = false
    const socket = new WebSocketImpl(`${url}/room/${place}/${slot}`)
    ws = socket
    socket.onopen = async () => {
      const t = await token() // asked every time, so a refreshed sign-in is used after a long session
      if (stopped || ws !== socket) return
      if (!t) return socket.close()
      socket.send(JSON.stringify({ t: 'hello', token: t }))
    }
    socket.onmessage = (e) => receive(String(e.data))
    socket.onclose = (e) => {
      if (stopped || ws !== socket) return
      if (full && slot < LAST_SLOT) {
        slot++
        return connect()
      }
      useRoom.setState({ ...EMPTY_ROOM, status: FINAL.has(e.code) ? 'off' : 'solo' })
      if (FINAL.has(e.code)) return
      retry = setTimeout(connect, BACKOFF_S[Math.min(attempt++, BACKOFF_S.length - 1)] * 1000)
    }
  }

  function flushMove() {
    if (!pending || moveTimer) return
    const wait = lastMove + MOVE_GAP_MS - Date.now()
    if (wait > 0) {
      moveTimer = setTimeout(() => {
        moveTimer = undefined
        flushMove()
      }, wait)
      return
    }
    send({ t: 'move', ...pending })
    pending = null
    lastMove = Date.now()
  }

  connect()
  return {
    sendMove(x, y, battle) {
      pending = { x, y, battle }
      flushMove()
    },
    sendEmote(e) {
      send({ t: 'emote', e })
    },
    stop() {
      stopped = true
      clearTimeout(retry)
      clearTimeout(moveTimer)
      ws?.close()
      useRoom.setState(EMPTY_ROOM)
    },
  }
}
