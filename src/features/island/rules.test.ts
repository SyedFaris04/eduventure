import { describe, expect, it } from 'vitest'
import { AREA, blockedTiles, centredAt, fits, footprint, ITEM, ITEMS, MAX_ITEMS } from './rules'
import { UNLOCKS } from '../../game/unlocks'
import en from '../../i18n/locales/en.json'

const placed = (item: string, x: number, y: number, rot = 0, id = 1) => ({ id, item, x, y, rot })

describe('island rules (the server checks the same)', () => {
  it('a footprint swaps width and height on odd turns', () => {
    expect(footprint(ITEM.hammock, 5, 5, 0)).toEqual(['5,5', '6,5'])
    expect(footprint(ITEM.hammock, 5, 5, 1)).toEqual(['5,5', '5,6'])
    expect(footprint(ITEM.house_pondok, 5, 5, 2)).toHaveLength(4)
  })

  it('fits inside the build area only, never overlapping, and an item may move onto its own tiles', () => {
    expect(AREA).toEqual({ x0: 4, y0: 4, x1: 27, y1: 27 })
    expect(MAX_ITEMS).toBe(400)
    expect(fits([], 'bush_round', 4, 4, 0)).toBe(true)
    expect(fits([], 'bush_round', 3, 4, 0)).toBe(false)
    expect(fits([], 'house_pondok', 27, 10, 0)).toBe(false) // 2 wide: runs past x 27
    const items = [placed('house_pondok', 10, 10)]
    expect(fits(items, 'bush_round', 11, 11, 0)).toBe(false)
    expect(fits(items, 'bush_round', 12, 11, 0)).toBe(true)
    expect(fits(items, 'house_pondok', 11, 10, 0, 1)).toBe(true) // moving itself one tile over
    expect(fits(items, 'house_pondok', 11, 10, 0)).toBe(false)
  })

  it('a tapped tile is the centre of the footprint', () => {
    expect(centredAt(ITEM.house_kampung, 10, 10, 0)).toEqual({ x: 9, y: 9 })
    expect(centredAt(ITEM.bush_round, 10, 10, 0)).toEqual({ x: 10, y: 10 })
    expect(centredAt(ITEM.hammock, 10, 10, 1)).toEqual({ x: 10, y: 10 })
  })

  it('only blocking items stop the hero', () => {
    const tiles = blockedTiles([placed('house_pondok', 10, 10), placed('path_dirt', 5, 5, 0, 2)])
    expect(tiles.has('11,11')).toBe(true)
    expect(tiles.has('5,5')).toBe(false)
  })

  it('level-locked items are in the client copy of the unlock list', () => {
    const locked = ITEMS.filter((i) => i.level > 1)
    expect(locked.length).toBeGreaterThan(10)
    for (const i of locked) expect(UNLOCKS).toContainEqual({ level: i.level, kind: 'island_item', key: i.id })
  })

  it('every item has a name and a group', () => {
    const names = (en as unknown as { island: { item: Record<string, string>; category: Record<string, string> } }).island
    for (const i of ITEMS) {
      expect(names.item[i.id], i.id).toBeTruthy()
      expect(names.category[i.category], i.category).toBeTruthy()
    }
  })
})
