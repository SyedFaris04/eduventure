import { describe, expect, it } from 'vitest'
import { parseMap, type GameMap } from '../../game/map'
import { PLACES } from '../../game/places'
import { FESTIVAL_KINDS } from '../../features/festival/festivalRules'
import { decoratedKinds, festivalLayout } from './festivalProps'

describe('festival decorations', () => {
  let map: GameMap
  it('loads the Kampung', async () => {
    map = parseMap(await PLACES.greenhaven.load!())
  })

  it('every festival decorates the Kampung on open grass, never on paths, props or blocked cells', () => {
    for (const kind of FESTIVAL_KINDS) {
      const pieces = festivalLayout(map, kind, true)
      const spots = pieces.flatMap((p) => p.items)
      expect(spots.length, kind).toBeGreaterThanOrEqual(6)
      for (const s of spots) {
        const [x, y] = [Math.floor(s.x), Math.floor(s.z)]
        const cell = map.cells[y][x]
        expect(cell.prop, `${kind} ${x},${y}`).toBeUndefined()
        expect(map.blocked(x, y), `${kind} ${x},${y}`).toBe(false)
        expect(['grass', 'flowers', 'sand']).toContain(cell.tile)
      }
      expect(new Set(spots.map((s) => `${s.x},${s.z}`)).size, kind).toBe(spots.length)
    }
  })

  it('is the same every time, and lighter when the device is slow or motion is reduced', () => {
    const count = (fancy: boolean) => festivalLayout(map, 'cny', fancy).flatMap((p) => p.items).length
    expect(festivalLayout(map, 'cny', true)).toEqual(festivalLayout(map, 'cny', true))
    expect(count(false)).toBeLessThan(count(true))
    expect(count(false)).toBeGreaterThan(0)
  })

  it('only the Kampung is decorated', () => {
    expect(decoratedKinds('greenhaven', ['cny', 'merdeka'])).toEqual(['cny', 'merdeka'])
    expect(decoratedKinds('science_island', ['cny'])).toEqual([])
  })
})
