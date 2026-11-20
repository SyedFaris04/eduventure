import { DurableObject } from 'cloudflare:workers'
import { PLACES, recipients, Room, type Card, type Out, type Player } from './room'

type Env = { ROOM: DurableObjectNamespace<RoomObject>; SUPABASE_URL: string; SUPABASE_PUBLISHABLE_KEY: string }
/** Kept on each socket so the room survives hibernation. */
type Tag = { conn: string; player: Player | null; openedAt: number }

const HELLO_MS = 5000

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname === '/health') return new Response('ok')
    const m = new URL(request.url).pathname.match(/^\/room\/([a-z_]+)\/(\d{1,2})$/)
    if (!m || !(PLACES as readonly string[]).includes(m[1]) || Number(m[2]) > 49) return new Response('Not found', { status: 404 })
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 })
    return env.ROOM.get(env.ROOM.idFromName(`${m[1]}:${Number(m[2])}`)).fetch(request)
  },
}

export class RoomObject extends DurableObject<Env> {
  private room = new Room(() => Date.now())

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    // Woken from hibernation: rebuild who is here from the sockets' attachments.
    for (const ws of ctx.getWebSockets()) {
      const tag = ws.deserializeAttachment() as Tag | null
      if (tag?.player) this.room.restore(tag.conn, tag.player)
    }
  }

  async fetch(): Promise<Response> {
    const [client, server] = Object.values(new WebSocketPair())
    const tag: Tag = { conn: crypto.randomUUID(), player: null, openedAt: Date.now() }
    this.ctx.acceptWebSocket(server)
    server.serializeAttachment(tag)
    // Sockets that never say hello are closed by the alarm.
    if ((await this.ctx.storage.getAlarm()) === null) await this.ctx.storage.setAlarm(Date.now() + HELLO_MS)
    return new Response(null, { status: 101, webSocket: client })
  }

  async alarm() {
    let waiting = false
    for (const ws of this.ctx.getWebSockets()) {
      const tag = ws.deserializeAttachment() as Tag
      if (tag.player) continue
      if (Date.now() - tag.openedAt >= HELLO_MS) ws.close(4000, 'hello timeout')
      else waiting = true
    }
    if (waiting) await this.ctx.storage.setAlarm(Date.now() + HELLO_MS)
  }

  async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer) {
    const tag = ws.deserializeAttachment() as Tag
    let msg: { t?: string; token?: unknown; x?: unknown; y?: unknown; battle?: unknown; e?: unknown }
    try {
      msg = JSON.parse(typeof data === 'string' ? data : new TextDecoder().decode(data))
    } catch {
      return ws.close(4000, 'bad message')
    }
    if (!tag.player) {
      if (msg.t !== 'hello' || typeof msg.token !== 'string') return ws.close(4000, 'hello first')
      const card = await this.card(msg.token)
      // The socket may have closed while the sign-in was checked: joining it now would leave a ghost behind.
      if (ws.readyState !== WebSocket.OPEN) return
      if (!card) return ws.close(4001, 'sign-in rejected')
      if (card.banned) return ws.close(4003, 'banned')
      const out = this.room.join(tag.conn, card)
      if (out === 'full') {
        ws.send(JSON.stringify({ t: 'full' }))
        return ws.close(1000, 'full')
      }
      this.save(ws, tag.conn)
      return this.deliver(out)
    }
    if (!this.room.note(tag.conn)) return ws.close(4008, 'too many messages')
    const out = msg.t === 'move' ? this.room.move(tag.conn, { x: msg.x, y: msg.y, battle: msg.battle }) : msg.t === 'emote' ? this.room.emote(tag.conn, msg.e) : []
    if (msg.t === 'move') this.save(ws, tag.conn)
    this.deliver(out)
  }

  async webSocketClose(ws: WebSocket) {
    this.deliver(this.room.leave((ws.deserializeAttachment() as Tag).conn))
  }

  async webSocketError(ws: WebSocket) {
    await this.webSocketClose(ws)
  }

  /** The player's card, read with their own token: a valid Supabase sign-in is the only way in. */
  private async card(token: string): Promise<Card | null> {
    const res = await fetch(`${this.env.SUPABASE_URL}/rest/v1/rpc/my_room_card`, {
      method: 'POST',
      headers: { apikey: this.env.SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: '{}',
    })
    if (!res.ok) return null
    const card = (await res.json()) as Card | null
    return card?.public_id ? card : null
  }

  private save(ws: WebSocket, conn: string) {
    const tag = ws.deserializeAttachment() as Tag
    ws.serializeAttachment({ ...tag, player: this.room.player(conn) ?? null })
  }

  private deliver(out: Out[]) {
    if (!out.length) return
    const sockets = new Map(this.ctx.getWebSockets().map((ws) => [(ws.deserializeAttachment() as Tag).conn, ws]))
    for (const o of out) {
      const text = JSON.stringify(o.msg)
      for (const conn of recipients(o, [...sockets.keys()], (c) => this.room.player(c) !== undefined)) {
        const s = { ws: sockets.get(conn)! }
        try {
          s.ws.send(text)
          if ((o.msg as { t: string }).t === 'replaced') s.ws.close(4002, 'replaced')
        } catch {
          // A socket that just closed: its close handler tells the others.
        }
      }
    }
  }
}
