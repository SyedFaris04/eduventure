import { describe, expect, it } from 'vitest'
import { gridToScreen, screenToGrid, TILE_W, TILE_H } from './iso'
import { parseMap } from './map'
import { GREENHAVEN } from './maps/greenhaven'
import { canStandBeside, reachable } from './reach.testutil'

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

  it('is 52 × 52 with every row the same width', () => {
    expect(map.width).toBe(52)
    expect(map.height).toBe(52)
    expect(GREENHAVEN.rows.every((r) => r.length === 52)).toBe(true)
  })
  it('only uses characters from its legend', () => {
    const unknown = GREENHAVEN.rows.join('').split('').filter((c) => !(c in GREENHAVEN.legend))
    expect(unknown).toEqual([])
  })
  it('has a walkable player spawn and blocked borders', () => {
    expect(map.blocked(map.spawn.x, map.spawn.y)).toBe(false)
    for (let i = 0; i < 52; i++) {
      // the jetty runs off the south edge into the sea; everything else on the border is blocked
      const jetty = map.cells[51][i].tile === 'jetty'
      expect(map.blocked(i, 0) && (jetty || map.blocked(i, 51)) && map.blocked(0, i) && map.blocked(51, i)).toBe(true)
    }
    expect(map.blocked(-1, 5)).toBe(true)
  })
  it('has walkable spawn zones for all three monsters and both NPCs', () => {
    for (const zone of ['sproutling', 'pebblewing', 'dinobud'] as const) {
      expect(map.monsterZones[zone]!.length).toBeGreaterThan(8)
      expect(map.monsterZones[zone]!.every((p) => !map.blocked(p.x, p.y))).toBe(true)
    }
    expect(map.npcs.map((n) => n.id).sort()).toEqual(['boatman', 'elder', 'shopkeeper'])
    expect(map.bosses).toEqual([{ id: 'guardian', x: 17, y: 20 }])
    // the Guardian can be reached on foot from the spawn (a free tile next to it)
    expect(map.blocked(17, 21)).toBe(false)
  })

  it('is a kampung with a jetty, palms, kampung houses and named areas', () => {
    expect(map.theme).toBe('kampung')
    expect(map.areas.map((a) => a.name)).toEqual(expect.arrayContaining(['Jeti Melaka', 'Pasar Malam', 'Kampung Greenhaven']))
    expect(map.props.filter((p) => p.kind === 'palm').length).toBeGreaterThanOrEqual(6)
    expect(map.props.filter((p) => p.kind === 'kampung_house').length).toBeGreaterThanOrEqual(2)
    expect(map.props.some((p) => p.kind === 'stall')).toBe(true)
    expect(map.monsterCounts).toEqual({ sproutling: 6, pebblewing: 5, dinobud: 5 })
  })
  it('the boatman can be reached from the spawn and from the arrival point', () => {
    const boatman = map.npcs.find((n) => n.id === 'boatman')!
    expect(canStandBeside(reachable(map, map.spawn), boatman.x, boatman.y)).toBe(true)
    expect(reachable(map, map.arrival).has(`${map.spawn.x},${map.spawn.y}`)).toBe(true)
    expect(Math.hypot(boatman.x - map.spawn.x, boatman.y - map.spawn.y)).toBeLessThanOrEqual(10)
  })
})
