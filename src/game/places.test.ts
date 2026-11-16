import { beforeEach, describe, expect, it } from 'vitest'
import { areaAt, parseMap } from './map'
import { INTERACT_RANGE } from './movement'
import { BUILT_PLACES, PLACES } from './places'
import { loadPlace } from './placeStore'
import { canStandBeside, reachable } from './reach.testutil'

describe('place store', () => {
  beforeEach(() => localStorage.clear())
  it('place store falls back', () => {
    for (const bad of ['atlantis', 'technology_city', '']) {
      localStorage.setItem('eduventure.place', bad)
      expect(loadPlace()).toBe('greenhaven')
    }
    localStorage.clear()
    expect(loadPlace()).toBe('greenhaven')
  })
  it('remembers a built place', () => {
    const other = BUILT_PLACES.find((p) => p !== 'greenhaven')
    if (!other) return
    localStorage.setItem('eduventure.place', other)
    expect(loadPlace()).toBe(other)
  })
})

describe('places', () => {
  it('every built place loads and parses', async () => {
    expect(BUILT_PLACES).toContain('greenhaven')
    expect(PLACES.technology_city.built).toBe(false)
    expect(PLACES.language_kingdom.built).toBe(false)
    for (const id of BUILT_PLACES) {
      const map = parseMap(await PLACES[id].load!())
      expect(map.id).toBe(id)
      const boatman = map.npcs.find((n) => n.id === 'boatman')
      expect(boatman, id).toBeDefined()
      expect(map.cells.flat().some((c) => c.tile === 'jetty'), id).toBe(true)
      expect(Math.hypot(map.arrival.x - boatman!.x, map.arrival.y - boatman!.y), id).toBeLessThanOrEqual(INTERACT_RANGE + 1)
    }
  })

  it('areaAt finds the named rectangle', async () => {
    const map = parseMap(await PLACES.greenhaven.load!())
    const a = map.areas[0]
    expect(areaAt(map, { x: a.x0 + 0.5, y: a.y0 + 0.5 })).toBe(a.name)
    expect(areaAt(map, { x: -5, y: -5 })).toBeNull()
  })
})

describe('islands', () => {
  const cases = [
    { id: 'science_island', theme: 'rainforest', kinds: ['hornbill', 'tapir', 'pangolin'], boss: 'raja_rafflesia', areas: ['Hutan Borneo', 'Air Terjun Langkawi', 'Paya Bakau', 'Pekan Kuching'] },
    { id: 'mathematics_mountains', theme: 'alpine', kinds: ['cubelet', 'hexowl', 'pisnake'], boss: 'abacus_titan', areas: ['Summit Gate', 'Sundial Terraces', 'Pillar Pass'] },
  ] as const

  for (const c of cases)
    it(`islands are wide and complete: ${c.id}`, async () => {
      expect(BUILT_PLACES).toContain(c.id)
      const src = await PLACES[c.id].load!()
      const unknown = src.rows.join('').split('').filter((ch) => !(ch in src.legend))
      expect(unknown).toEqual([])
      expect(src.rows.every((r) => r.length === src.rows[0].length)).toBe(true)
      const map = parseMap(src)
      expect(map.width).toBeGreaterThanOrEqual(44)
      expect(map.height).toBeGreaterThanOrEqual(44)
      expect(map.theme).toBe(c.theme)
      expect(Object.keys(map.monsterZones).sort()).toEqual([...c.kinds].sort())
      for (const k of c.kinds) expect(map.monsterCounts[k]).toBeGreaterThan(0)
      expect(map.bosses.map((b) => b.id)).toEqual([c.boss])
      expect(map.areas.map((a) => a.name)).toEqual(expect.arrayContaining([...c.areas]))

      const r = reachable(map, map.arrival)
      for (const k of c.kinds) for (const t of map.monsterZones[k]!) expect(r.has(`${t.x},${t.y}`), `${k} ${t.x},${t.y}`).toBe(true)
      const boss = map.bosses[0]
      expect(canStandBeside(r, boss.x, boss.y)).toBe(true)
      const boatman = map.npcs.find((n) => n.id === 'boatman')!
      expect(canStandBeside(r, boatman.x, boatman.y)).toBe(true)
    })
})
