import { describe, expect, it } from 'vitest'
import { ITEMS } from '../../features/island/rules'
import { islandModelIds, islandRawParts } from './islandProps'

describe('island models', () => {
  it('every catalogue item has a model, and no model is left over', () => {
    expect(islandModelIds().sort()).toEqual(ITEMS.map((i) => i.id).sort())
  })

  it('each model stands inside its footprint (so neighbours never overlap on screen)', () => {
    for (const item of ITEMS) {
      for (const [, , at, size] of islandRawParts(item.id)) {
        // Parts are unit shapes scaled by size; a little slack for rounded and turned parts.
        expect.soft(Math.abs(at[0]) + size[0] / 2, `${item.id} x`).toBeLessThanOrEqual(item.w / 2 + 0.12)
        expect.soft(Math.abs(at[2]) + size[2] / 2, `${item.id} z`).toBeLessThanOrEqual(item.h / 2 + 0.12)
        expect.soft(at[1] - size[1] / 2, `${item.id} below ground`).toBeGreaterThanOrEqual(-0.25)
      }
    }
  })
})
