import { describe, expect, it } from 'vitest'
import type { GameMap, TileKind } from '../game/map'
import { butterflyAt, butterflyHomes, cloudAt } from './livelyMotion'

/** A plain map from rows of letters: f = flowers, g = grass. */
const mapOf = (rows: string[]) =>
  ({ width: rows[0].length, height: rows.length, cells: rows.map((r) => [...r].map((c) => ({ tile: (c === 'f' ? 'flowers' : 'grass') as TileKind }))) }) as unknown as GameMap

describe('butterflies', () => {
  const home = { x: 10, z: 10 }

  it('flutter around their flower patch, low over the grass', () => {
    for (let t = 0; t < 120; t += 0.37) {
      const p = butterflyAt(home, 3, t)
      expect(Math.abs(p.x - home.x)).toBeLessThanOrEqual(1.7)
      expect(Math.abs(p.z - home.z)).toBeLessThanOrEqual(1.3)
      expect(p.y).toBeGreaterThan(0.2)
      expect(p.y).toBeLessThan(0.9)
    }
  })

  it('each flies its own path', () => {
    const a = butterflyAt(home, 0, 5)
    const b = butterflyAt(home, 1, 5)
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(0.05)
  })

  it('live by flowers, spread out, a limited number', () => {
    const map = mapOf(['ffffffffffff', 'gggggggggggg', 'gggggggggggg', 'gggggggggggg', 'ffffffffffff'])
    const homes = butterflyHomes(map, 3)
    expect(homes.length).toBe(3)
    for (const h of homes) expect(map.cells[Math.floor(h.z)][Math.floor(h.x)].tile).toBe('flowers')
    for (const a of homes) for (const b of homes) if (a !== b) expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThanOrEqual(4)
    expect(butterflyHomes(mapOf(['gggg', 'gggg']))).toEqual([])
  })

  it('spread over the whole island, not just the first flowers found', () => {
    const rows = Array.from({ length: 40 }, () => 'f'.repeat(40))
    const homes = butterflyHomes(mapOf(rows), 8)
    expect(homes.some((h) => h.z < 20)).toBe(true)
    expect(homes.some((h) => h.z >= 20)).toBe(true)
    expect(butterflyHomes(mapOf(rows), 8)).toEqual(homes) // the same every visit
  })
})

describe('cloud shadows', () => {
  it('drift across the island and come back in from the far side', () => {
    const a = cloudAt(2, 0, 40, 30)
    const b = cloudAt(2, 10, 40, 30)
    expect(b.x).not.toBeCloseTo(a.x)
    for (let t = 0; t < 600; t += 7) {
      const c = cloudAt(4, t, 40, 30)
      expect(c.x).toBeGreaterThanOrEqual(-c.size)
      expect(c.x).toBeLessThanOrEqual(40 + c.size)
      expect(c.z).toBeGreaterThanOrEqual(-c.size)
      expect(c.z).toBeLessThanOrEqual(30 + c.size)
    }
  })
})
