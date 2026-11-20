import { describe, expect, it } from 'vitest'
import { CAMP_BUILDS } from '../../game/map'
import { campParts, harvestParts, HARVEST_KINDS } from './harvestProps'

describe('harvest and camp models', () => {
  it('every node has a ready and a smaller regrowing look', () => {
    for (const k of HARVEST_KINDS) {
      expect(harvestParts(k, true).length, k).toBeGreaterThan(harvestParts(k, false).length - 1)
      expect(harvestParts(k, false).length, k).toBeGreaterThan(0)
    }
  })
  it('the workbench and every camp build are drawable', () => {
    for (const k of ['workbench', ...CAMP_BUILDS] as const) expect(campParts(k).length, k).toBeGreaterThan(1)
  })
})
