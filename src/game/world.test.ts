import { describe, expect, it } from 'vitest'
import { gridToScreen, screenToGrid, TILE_W, TILE_H } from './iso'
import { parseMap } from './map'
import { GREENHAVEN } from './maps/greenhaven'

describe('isometric projection', () => {
  it('maps the origin to the origin and one step east half a tile right and down', () => {
    expect(gridToScreen({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
    expect(gridToScreen({ x: 1, y: 0 })).toEqual({ x: TILE_W / 2, y: TILE_H / 2 })
    expect(gridToScreen({ x: 0, y: 1 })).toEqual({ x: -TILE_W / 2, y: TILE_H / 2 })
  })
  it('round-trips grid → screen → grid', () => {
    for (const p of [{ x: 3, y: 7 }, { x: 0.5, y: 12.25 }, { x: 35, y: 0 }, { x: 18, y: 18 }, { x: 2.75, y: 30.5 }]) {
      const back = screenToGrid(gridToScreen(p))
      expect(back.x).toBeCloseTo(p.x)
      expect(back.y).toBeCloseTo(p.y)
    }
  })
})

describe('Greenhaven map', () => {
  const map = parseMap(GREENHAVEN)

  it('is 36 × 36 with every row the same width', () => {
    expect(map.width).toBe(36)
    expect(map.height).toBe(36)
    expect(GREENHAVEN.rows.every((r) => r.length === 36)).toBe(true)
  })
  it('only uses characters from its legend', () => {
    const unknown = GREENHAVEN.rows.join('').split('').filter((c) => !(c in GREENHAVEN.legend))
    expect(unknown).toEqual([])
  })
  it('has a walkable player spawn and blocked borders', () => {
    expect(map.blocked(map.spawn.x, map.spawn.y)).toBe(false)
    for (let i = 0; i < 36; i++) {
      expect(map.blocked(i, 0) && map.blocked(i, 35) && map.blocked(0, i) && map.blocked(35, i)).toBe(true)
    }
    expect(map.blocked(-1, 5)).toBe(true)
  })
  it('has walkable spawn zones for all three monsters and both NPCs', () => {
    for (const zone of ['sproutling', 'pebblewing', 'dinobud'] as const) {
      expect(map.monsterZones[zone].length).toBeGreaterThan(8)
      expect(map.monsterZones[zone].every((p) => !map.blocked(p.x, p.y))).toBe(true)
    }
    expect(map.npcs.map((n) => n.id).sort()).toEqual(['elder', 'shopkeeper'])
  })
})
