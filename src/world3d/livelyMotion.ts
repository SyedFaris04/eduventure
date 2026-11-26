import type { GameMap } from '../game/map'

/** Motion for High graphics' living extras (decision #54). Pure, so it is unit-tested; the components just draw it. */
export type Spot = { x: number; z: number }

/** Where butterfly `i` is at `t` seconds: loose loops around its flower patch, bobbing low over the grass. */
export function butterflyAt(home: Spot, i: number, t: number) {
  const p = i * 1.7
  return {
    x: home.x + Math.sin(t * 0.5 + p) * 1.3 + Math.sin(t * 1.3 + p * 2) * 0.35,
    y: 0.55 + Math.sin(t * 1.1 + p) * 0.25 + Math.sin(t * 3.1 + p) * 0.06,
    z: home.z + Math.sin(t * 1.0 + p) * 0.9 + Math.cos(t * 1.7 + p) * 0.3,
  }
}

// A stable shuffle key, so the butterflies live in the same places on every visit.
const scatter = (s: Spot) => {
  const v = Math.sin(s.x * 127.1 + s.z * 311.7) * 43758.5453
  return v - Math.floor(v)
}

/**
 * Flower tiles for butterflies to live by: at most `max`, at least 4 tiles apart, spread over the whole island
 * (taken in a fixed shuffled order, not row by row). None on islands without flowers.
 */
export function butterflyHomes(map: GameMap, max = 24): Spot[] {
  const flowers = map.cells.flatMap((row, y) => row.flatMap((cell, x) => (cell.tile === 'flowers' ? [{ x: x + 0.5, z: y + 0.5 }] : [])))
  const homes: Spot[] = []
  for (const s of flowers.sort((a, b) => scatter(a) - scatter(b)))
    if (homes.length < max && homes.every((h) => Math.hypot(h.x - s.x, h.z - s.z) >= 4)) homes.push(s)
  return homes
}

const wrap = (v: number, span: number) => ((v % span) + span) % span

/** Cloud shadow `i` at `t` seconds: it drifts with the wind across the island, then comes back in from the far side. */
export function cloudAt(i: number, t: number, w: number, h: number) {
  const size = 6 + (i % 3) * 2.5
  const speed = 0.45 + (i % 2) * 0.1
  const x0 = ((i * 0.618) % 1) * (w + 2 * size)
  const z0 = ((i * 0.382 + 0.2) % 1) * (h + 2 * size)
  return { x: wrap(x0 + t * speed, w + 2 * size) - size, z: wrap(z0 + t * speed * 0.45, h + 2 * size) - size, size }
}
