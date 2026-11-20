/**
 * One island room: who is in it, where they are, and what to tell whom. No Cloudflare code here, so it is
 * tested directly (server/rooms/src/room.test.ts). Positions are display-only; nothing of value depends on them.
 */
export const PLACES = ['greenhaven', 'science_island', 'mathematics_mountains', 'technology_city', 'language_kingdom'] as const
export const EMOTES = ['wave', 'cheer', 'clap', 'thumbs_up', 'good_luck', 'well_done'] as const
export const MAX_VISIBLE = 12
const MOVES_PER_SECOND = 4
const EMOTE_GAP_MS = 2000
/** Above this, a connection is flooding (every incoming message is billed), and the server closes it. */
const MESSAGES_PER_SECOND = 20

/** From the database (my_room_card), read with the player's own token. */
export type Card = { public_id: string; visible: boolean; can_emote: boolean; banned: boolean; name: string | null; appearance: unknown; pet: unknown }
export type Player = { card: Card; x: number; y: number; battle: boolean }
/** `all-but`: everyone except `conn`; `one`: only `conn`; `all`: everyone. */
export type Out = { to: 'all-but' | 'one' | 'all'; conn: string; msg: object }

type Slot = Player & { moves: number[]; lastEmote: number; msgs: number[] }

const coord = (v: unknown) => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : 0
  return Math.round(Math.min(200, Math.max(0, n)) * 100) / 100
}
const shown = (id: string, p: Player) => ({ id, name: p.card.name, appearance: p.card.appearance, pet: p.card.pet, x: p.x, y: p.y, battle: p.battle })

export class Room {
  private slots = new Map<string, Slot>()
  constructor(private now: () => number) {}

  player(conn: string): Player | undefined {
    const s = this.slots.get(conn)
    return s && { card: s.card, x: s.x, y: s.y, battle: s.battle }
  }

  /** Puts back a player after the object woke from hibernation. */
  restore(conn: string, p: Player) {
    this.slots.set(conn, { ...p, moves: [], lastEmote: 0, msgs: [] })
  }

  join(conn: string, card: Card): Out[] | 'full' {
    const out: Out[] = []
    let replacing: Slot | undefined
    for (const [c, s] of this.slots) {
      if (s.card.public_id !== card.public_id) continue
      replacing = s
      this.slots.delete(c)
      out.push({ to: 'one', conn: c, msg: { t: 'replaced' } })
    }
    const visible = [...this.slots.values()].filter((s) => s.card.visible).length
    if (card.visible && !replacing && visible >= MAX_VISIBLE) return 'full'
    const slot: Slot = { card, x: replacing?.x ?? 0, y: replacing?.y ?? 0, battle: false, moves: [], lastEmote: 0, msgs: [] }
    const others = [...this.slots.entries()].filter(([, s]) => s.card.visible).map(([, s]) => shown(s.card.public_id, s))
    this.slots.set(conn, slot)
    out.push({ to: 'one', conn, msg: { t: 'welcome', you: card.public_id, visible: card.visible, can_emote: card.can_emote, players: others } })
    // A replaced connection was already announced, so the others see one hero, not two.
    if (card.visible && !(replacing && replacing.card.visible)) out.push({ to: 'all-but', conn, msg: { t: 'join', p: shown(card.public_id, slot) } })
    // Seen before and hidden now (say a parent switched them off, then they opened a second tab): gone for the others.
    if (!card.visible && replacing?.card.visible) out.push({ to: 'all-but', conn, msg: { t: 'leave', id: card.public_id } })
    return out
  }

  /** Counts one incoming message; false when the connection sends more than it ever should. */
  note(conn: string): boolean {
    const s = this.slots.get(conn)
    if (!s) return true
    const t = this.now()
    s.msgs = s.msgs.filter((at) => t - at < 1000)
    s.msgs.push(t)
    return s.msgs.length <= MESSAGES_PER_SECOND
  }

  leave(conn: string): Out[] {
    const s = this.slots.get(conn)
    if (!s) return []
    this.slots.delete(conn)
    return s.card.visible ? [{ to: 'all-but', conn, msg: { t: 'leave', id: s.card.public_id } }] : []
  }

  move(conn: string, m: { x: unknown; y: unknown; battle: unknown }): Out[] {
    const s = this.slots.get(conn)
    if (!s) return []
    const t = this.now()
    s.moves = s.moves.filter((at) => t - at < 1000)
    if (s.moves.length >= MOVES_PER_SECOND) return []
    s.moves.push(t)
    s.x = coord(m.x)
    s.y = coord(m.y)
    s.battle = Boolean(m.battle)
    return s.card.visible ? [{ to: 'all-but', conn, msg: { t: 'move', id: s.card.public_id, x: s.x, y: s.y, battle: s.battle } }] : []
  }

  emote(conn: string, e: unknown): Out[] {
    const s = this.slots.get(conn)
    if (!s || !s.card.visible || !s.card.can_emote || !(EMOTES as readonly unknown[]).includes(e)) return []
    const t = this.now()
    if (s.lastEmote && t - s.lastEmote < EMOTE_GAP_MS) return []
    s.lastEmote = t
    return [{ to: 'all', conn, msg: { t: 'emote', id: s.card.public_id, e } }]
  }
}

/** Which sockets get a message: room traffic only reaches players who joined (said hello with a valid sign-in); a direct message reaches its own socket. */
export function recipients(o: Out, conns: string[], joined: (conn: string) => boolean): string[] {
  if (o.to === 'one') return conns.filter((c) => c === o.conn)
  return conns.filter((c) => joined(c) && (o.to === 'all' || c !== o.conn))
}
