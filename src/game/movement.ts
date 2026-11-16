import { TILE_H, TILE_W, type Point } from './iso'

export const SPEED = 3.2 // tiles per second
export const RADIUS = 0.3 // collision radius in tiles
export const INTERACT_RANGE = 1.5 // tiles between centres; covers standing diagonally next to someone

type Blocked = (x: number, y: number) => boolean

const hits = (x: number, y: number, blocked: Blocked) =>
  blocked(x - RADIUS, y - RADIUS) || blocked(x + RADIUS - 1e-6, y - RADIUS) || blocked(x - RADIUS, y + RADIUS - 1e-6) || blocked(x + RADIUS - 1e-6, y + RADIUS - 1e-6)

/**
 * One movement step. Axes are resolved separately, so the player slides along walls and can never
 * pass diagonally between two blocked corners. `dir` is a grid-space vector of length ≤ 1.
 */
export function step(pos: Point, dir: Point, dt: number, blocked: Blocked): Point {
  let { x, y } = pos
  const dx = dir.x * SPEED * dt
  const dy = dir.y * SPEED * dt
  if (dx !== 0 && !hits(x + dx, y, blocked)) x += dx
  if (dy !== 0 && !hits(x, y + dy, blocked)) y += dy
  return hits(x, y, blocked) ? pos : { x, y }
}

/** Screen-space input (up = −y) → normalised grid-space direction. */
export function screenDirToGrid(d: Point): Point {
  const gx = d.y / TILE_H + d.x / TILE_W
  const gy = d.y / TILE_H - d.x / TILE_W
  const len = Math.hypot(gx, gy)
  return len === 0 ? { x: 0, y: 0 } : { x: gx / len, y: gy / len }
}

/**
 * Path for a tap on `tap`. Tapping a blocked tile (an NPC, a tree) walks to the free neighbour
 * closest to the player instead.
 */
export function tapGoal(tap: Point, from: Point, blocked: Blocked): Point[] | null {
  let goal = tap
  if (blocked(goal.x, goal.y)) {
    // Side-by-side neighbours first (closest to the tapped thing), diagonal ones only as a fallback.
    const around = [-1, 0, 1].flatMap((dx) => [-1, 0, 1].map((dy) => ({ x: tap.x + dx, y: tap.y + dy, diag: dx !== 0 && dy !== 0 })))
    const free = around
      .filter((p) => !blocked(p.x, p.y))
      .sort((a, b) => Number(a.diag) - Number(b.diag) || Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y))
      .map(({ x, y }) => ({ x, y }))
    if (!free.length) return null
    goal = free[0]
  }
  return findPath(from, goal, blocked)
}

/** Walks along a tile path; drops waypoints as they are reached and gives up if movement is blocked. */
export function followPath(pos: Point, path: Point[], dt: number, blocked: Blocked): { pos: Point; path: Point[]; dir: Point } {
  if (!path.length) return { pos, path, dir: { x: 0, y: 0 } }
  const target = { x: path[0].x + 0.5, y: path[0].y + 0.5 }
  const v = { x: target.x - pos.x, y: target.y - pos.y }
  const d = Math.hypot(v.x, v.y)
  if (d < 0.08) return { pos, path: path.slice(1), dir: { x: 0, y: 0 } }
  const dir = { x: v.x / d, y: v.y / d }
  const next = step(pos, dir, Math.min(dt, d / SPEED), blocked)
  const moved = next.x !== pos.x || next.y !== pos.y
  return { pos: next, path: moved ? path : [], dir }
}

/** A* over tiles, 8-way without corner cutting. Returns the steps after `start`, or null. */
export function findPath(start: Point, goal: Point, blocked: Blocked, limit = 4000): Point[] | null {
  if (blocked(goal.x, goal.y)) return null
  const key = (p: Point) => `${p.x},${p.y}`
  const h = (p: Point) => Math.max(Math.abs(p.x - goal.x), Math.abs(p.y - goal.y))
  const open: { p: Point; g: number; f: number }[] = [{ p: start, g: 0, f: h(start) }]
  const came = new Map<string, Point>()
  const best = new Map<string, number>([[key(start), 0]])
  let expanded = 0
  while (open.length && expanded++ < limit) {
    open.sort((a, b) => a.f - b.f)
    const { p, g } = open.shift()!
    if (p.x === goal.x && p.y === goal.y) {
      const path: Point[] = []
      for (let c: Point | undefined = p; c && key(c) !== key(start); c = came.get(key(c))) path.unshift(c)
      return path
    }
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue
        const n = { x: p.x + dx, y: p.y + dy }
        if (blocked(n.x, n.y)) continue
        if (dx && dy && (blocked(p.x + dx, p.y) || blocked(p.x, p.y + dy))) continue
        const ng = g + (dx && dy ? Math.SQRT2 : 1)
        if (ng >= (best.get(key(n)) ?? Infinity)) continue
        best.set(key(n), ng)
        came.set(key(n), p)
        open.push({ p: n, g: ng, f: ng + h(n) })
      }
  }
  return null
}
