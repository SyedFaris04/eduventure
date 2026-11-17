import type { Point } from './iso'
import type { GameMap, MonsterKind } from './map'
import { followPath, INTERACT_RANGE, screenDirToGrid, SPEED, step, tapGoal } from './movement'
import type { Prompt } from './store'

export const RESPAWN_MS = 20_000
const MONSTER_SPEED = 1.1 // tiles per second

export type SimMonster = {
  id: string
  kind: MonsterKind
  pos: Point
  alive: boolean
  /** 0..1 while hopping to the next tile, −1 when standing. */
  hopT: number
  /** World y-rotation the monster faces (0 = +z). */
  facing: number
  respawnAt: number
  nextMove: number
  hop?: { from: Point; to: Point }
}

/**
 * One place's game logic without any drawing: the hero's movement, wandering monsters, respawns and the
 * interact prompt. The 3D scene reads this every frame; tests drive it directly.
 */
export class WorldSim {
  hero: { pos: Point; dir: Point; speed01: number; facing: number }
  monsters: SimMonster[] = []
  path: Point[] = []

  constructor(
    readonly map: GameMap,
    private rng: () => number = Math.random,
    opts: { atArrival?: boolean; start?: Point } = {},
  ) {
    // A saved spot (coming back from the Academy) beats the jetty, which beats the first-time spawn.
    const start = opts.start ?? (opts.atArrival ? map.arrival : map.spawn)
    this.hero = { pos: { x: start.x + 0.5, y: start.y + 0.5 }, dir: { x: 0, y: 0 }, speed01: 0, facing: 0 }
    for (const [kind, count] of Object.entries(map.monsterCounts) as [MonsterKind, number][])
      for (let i = 0; i < (map.monsterZones[kind]?.length ? count : 0); i++) {
        const t = this.freeZoneTile(kind)
        this.monsters.push({ id: `${kind}-${i}`, kind, pos: { x: t.x + 0.5, y: t.y + 0.5 }, alive: true, hopT: -1, facing: this.rng() * Math.PI * 2, respawnAt: 0, nextMove: 1500 + this.rng() * 3000 })
      }
  }

  private freeZoneTile(kind: MonsterKind): Point {
    const tiles = this.map.monsterZones[kind]!
    for (let i = 0; i < 20; i++) {
      const t = tiles[Math.floor(this.rng() * tiles.length)]
      if (!this.monsters.some((m) => m.alive && Math.floor(m.pos.x) === t.x && Math.floor(m.pos.y) === t.y)) return t
    }
    return tiles[0]
  }

  /** A tap or click on the ground at a (fractional) grid point. */
  tap(grid: Point) {
    const from = { x: Math.floor(this.hero.pos.x), y: Math.floor(this.hero.pos.y) }
    this.path = tapGoal({ x: Math.floor(grid.x), y: Math.floor(grid.y) }, from, this.map.blocked) ?? []
  }

  defeat(id: string, now: number) {
    const m = this.monsters.find((x) => x.id === id)
    if (!m || !m.alive) return
    m.alive = false
    m.hop = undefined
    m.hopT = -1
    m.respawnAt = now + RESPAWN_MS
  }

  /** `input` is the screen-space stick or keys (up = −y); `now` is in milliseconds. */
  update(dt: number, input: Point, now: number, paused: boolean) {
    this.moveHero(dt, input, paused)
    for (const m of this.monsters) this.moveMonster(m, dt, now, paused)
  }

  private moveHero(dt: number, input: Point, paused: boolean) {
    const h = this.hero
    h.speed01 = 0
    if (paused) return
    let dir: Point = { x: 0, y: 0 }
    let next = h.pos
    if (input.x || input.y) {
      this.path = []
      const len = Math.min(1, Math.hypot(input.x, input.y))
      const g = screenDirToGrid(input)
      dir = { x: g.x * len, y: g.y * len }
      next = step(h.pos, dir, dt, this.map.blocked)
    } else if (this.path.length) {
      const r = followPath(h.pos, this.path, dt, this.map.blocked)
      ;({ dir, path: this.path } = r)
      next = r.pos
    }
    const moved = Math.hypot(next.x - h.pos.x, next.y - h.pos.y)
    h.pos = next
    h.dir = dir
    if (moved > 0) {
      h.speed01 = Math.min(1, moved / (SPEED * dt))
      h.facing = Math.atan2(dir.x, dir.y) // grid x → world x, grid y → world z
    }
  }

  private moveMonster(m: SimMonster, dt: number, now: number, paused: boolean) {
    if (!m.alive) {
      if (now >= m.respawnAt) {
        const t = this.freeZoneTile(m.kind)
        m.pos = { x: t.x + 0.5, y: t.y + 0.5 }
        m.alive = true
        m.nextMove = now + 2000 + this.rng() * 3500
      }
      return
    }
    if (!m.hop && !paused && now > m.nextMove) {
      m.nextMove = now + 2000 + this.rng() * 3500
      const zone = this.map.monsterZones[m.kind]!
      const options = zone.filter((t) => Math.abs(t.x + 0.5 - m.pos.x) <= 1 && Math.abs(t.y + 0.5 - m.pos.y) <= 1 && !(t.x + 0.5 === m.pos.x && t.y + 0.5 === m.pos.y) && !this.map.blocked(t.x, t.y))
      const t = options[Math.floor(this.rng() * options.length)]
      if (t) {
        m.hop = { from: { ...m.pos }, to: { x: t.x + 0.5, y: t.y + 0.5 } }
        m.facing = Math.atan2(m.hop.to.x - m.pos.x, m.hop.to.y - m.pos.y)
      }
    }
    if (!m.hop) {
      m.hopT = -1
      return
    }
    const { from, to } = m.hop
    const dist = Math.hypot(to.x - from.x, to.y - from.y)
    m.hopT = Math.min(1, (m.hopT < 0 ? 0 : m.hopT) + (MONSTER_SPEED * dt) / dist)
    m.pos = { x: from.x + (to.x - from.x) * m.hopT, y: from.y + (to.y - from.y) * m.hopT }
    if (m.hopT >= 1) {
      m.pos = { ...to }
      m.hop = undefined
    }
  }

  prompt(): Prompt | null {
    const p = this.hero.pos
    const dist = (q: Point) => Math.hypot(q.x - p.x, q.y - p.y)
    const npc = this.map.npcs.find((n) => dist({ x: n.x + 0.5, y: n.y + 0.5 }) <= INTERACT_RANGE)
    if (npc) return { kind: 'npc', id: npc.id }
    const boss = this.map.bosses.find((b) => dist({ x: b.x + 0.5, y: b.y + 0.5 }) <= INTERACT_RANGE)
    if (boss) return { kind: 'boss', id: boss.id }
    const monster = this.monsters.filter((m) => m.alive && dist(m.pos) <= INTERACT_RANGE).sort((a, b) => dist(a.pos) - dist(b.pos))[0]
    return monster ? { kind: 'monster', id: monster.id, monster: monster.kind } : null
  }
}
