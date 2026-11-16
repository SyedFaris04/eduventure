import { beforeEach, describe, expect, it } from 'vitest'
import { areaAt, parseMap } from './map'
import { INTERACT_RANGE } from './movement'
import { BUILT_PLACES, PLACES } from './places'
import { loadPlace } from './placeStore'

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
